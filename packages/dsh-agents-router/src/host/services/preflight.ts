import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { isRecord } from '../../shared/utils/validation.js';
import type { currentDirectory } from './sessionController.js';

const FILE_TOOLS = new Set(['read', 'read_image', 'write', 'edit', 'str_replace_editor']);
const SEARCH_TOOLS = new Set(['glob', 'grep']);

interface SessionContent {
    type: string;
    id?: string;
    name?: string;
    arguments?: string | Record<string, string | undefined>;
}

interface ToolCall extends SessionContent {
    id: string;
    name: string;
}

interface PreflightExec {
    agent?: PreflightAgent;
    parent?: string;
    callId: string;
    name: string;
    arguments?: Record<string, string | undefined>;
}

type PreflightAgent = Parameters<typeof currentDirectory>[2];

interface FileOperation {
    paths?: string[];
    error?: string;
}

interface FileCall {
    callId: string;
    name: string;
    paths?: string[];
}

interface FileBatch {
    calls: FileCall[];
    error?: string;
}

export function isFileTool(name: string): boolean {
    return FILE_TOOLS.has(name);
}

export function isSearchTool(name: string): boolean {
    return SEARCH_TOOLS.has(name);
}

/** Validate one known file call before any sibling in the same assistant batch runs. */
export function extractFileOperation(name: string, args: Record<string, string | undefined> | undefined): FileOperation {
    if (!FILE_TOOLS.has(name)) return { paths: [] };
    if (args === undefined || !isRecord(args)) return { error: `${name} arguments must be an object` };
    const input = args as Record<string, string | undefined>;
    let field = 'file_path';
    if (name === 'str_replace_editor') {
        field = 'path';
        if (typeof input.command !== 'string' || input.command.length === 0) return { error: 'str_replace_editor requires a command' };
    }
    const filePath = input[field];
    if (typeof filePath !== 'string' || filePath.trim() === '') return { error: `${name} requires a non-empty ${field}` };
    return { paths: [filePath] };
}

/** Read all file calls in a model-authored message, or one PTC child call. */
export function fileBatch(agent: PreflightAgent | undefined, exec: PreflightExec): FileBatch {
    if (exec.parent !== undefined) {
        const operation = extractFileOperation(exec.name, exec.arguments);
        return operation.error
            ? { error: operation.error, calls: [{ callId: exec.callId, name: exec.name }] }
            : { calls: [{ callId: exec.callId, name: exec.name, paths: operation.paths ?? [] }] };
    }
    const messages = agent?.session?.deriveMessages?.() ?? [];
    let batch: ToolCall[] | undefined;
    for (let i = messages.length - 1; i >= 0 && !batch; i--) {
        const message = messages[i];
        if (message?.role !== 'assistant' || !Array.isArray(message.content)) continue;
        if (message.content.some((block: SessionContent) => block.type === 'tool-call' && block.id === exec.callId))
            batch = message.content.filter(
                (block: SessionContent): block is ToolCall =>
                    block.type === 'tool-call' && typeof block.id === 'string' && typeof block.name === 'string'
            );
    }
    if (!batch)
        return {
            error: 'the assistant tool-call batch is unavailable for safe preflight',
            calls: [{ callId: exec.callId, name: exec.name }]
        };
    const calls: FileCall[] = [];
    let error: string | undefined;
    for (const block of batch) {
        if (!FILE_TOOLS.has(block.name)) continue;
        let args: Record<string, string | undefined> | undefined;
        if (block.id === exec.callId) args = exec.arguments;
        else {
            try {
                args = typeof block.arguments === 'string' ? JSON.parse(block.arguments) : block.arguments;
            } catch {
                error ??= `${block.name} arguments are not valid JSON`;
            }
        }
        const operation = extractFileOperation(block.name, args);
        error ??= operation.error;
        calls.push({ callId: block.id, name: block.name, paths: operation.paths ?? [] });
    }
    if (!calls.some(call => call.callId === exec.callId)) {
        return {
            error: 'the current file call is not present in the assistant tool-call batch',
            calls: [{ callId: exec.callId, name: exec.name }]
        };
    }
    return { calls, ...(error ? { error } : {}) };
}

/** Resolve aliases against the current Session directory and return project-relative forms. */
export async function projectPaths(projectRoot: string, workingDirectory: string, rawPath: string): Promise<string[]> {
    if (typeof rawPath !== 'string' || rawPath.trim() === '') return [];
    let lexical: string;
    try {
        lexical = path.resolve(workingDirectory, rawPath);
    } catch {
        return [];
    }
    const paths = new Set<string>();
    const lexicalRelative = relativeInside(projectRoot, lexical);
    if (lexicalRelative !== undefined) paths.add(lexicalRelative);
    try {
        const canonical = await realpath(lexical);
        const canonicalRelative = relativeInside(projectRoot, canonical);
        if (canonicalRelative !== undefined) paths.add(canonicalRelative);
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR'))) throw error;
        let ancestor = lexical;
        const tail: string[] = [];
        while (true) {
            const parent = path.dirname(ancestor);
            if (parent === ancestor) break;
            tail.unshift(path.basename(ancestor));
            ancestor = parent;
            try {
                const canonicalParent = await realpath(ancestor);
                const canonicalCandidate = path.resolve(canonicalParent, ...tail);
                const canonicalRelative = relativeInside(projectRoot, canonicalCandidate);
                if (canonicalRelative !== undefined) paths.add(canonicalRelative);
                break;
            } catch (parentError) {
                if (
                    !(
                        parentError instanceof Error &&
                        'code' in parentError &&
                        (parentError.code === 'ENOENT' || parentError.code === 'ENOTDIR')
                    )
                )
                    throw parentError;
            }
        }
    }
    return [...paths];
}

function relativeInside(root: string, target: string): string | undefined {
    const rel = path.relative(root, target);
    if (rel === '' || rel === '.') return '.';
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return undefined;
    return rel.split(path.sep).join('/');
}
