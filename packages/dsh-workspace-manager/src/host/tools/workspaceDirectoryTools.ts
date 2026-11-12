import { defineTool } from '@deepseek-ai/dsh-tools';
import type { AddDirectoryOptions, LinkedDirectory, WorkspaceDirectoriesService } from '../../shared/models/WorkspaceDirectories.js';

const directorySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        path: { type: 'string', required: true },
        alias: { type: 'string', required: true },
        description: { type: 'string' },
        readOnly: { type: 'boolean', required: true },
        addedAt: { type: 'number', required: true },
        source: { type: 'string', enum: ['primary', 'config', 'dynamic'], required: true }
    }
} as const;

function toToolDirectory(entry: LinkedDirectory) {
    return {
        path: entry.path,
        alias: entry.alias,
        ...(entry.description === undefined ? {} : { description: entry.description }),
        readOnly: entry.readOnly,
        addedAt: entry.addedAt,
        source: entry.source
    };
}

export function createListTool(service: WorkspaceDirectoriesService, toolName = 'addir_list') {
    return defineTool({
        name: toolName,
        description:
            'List all root and linked directories associated with the current workspace, including primary cwd, aliases, descriptions, and read-only flags.',
        parameters: {
            schemaVersion: {
                type: 'string',
                const: 'v1',
                description: 'Optional format version.'
            }
        },
        output: {
            schema: { type: 'array', items: directorySchema },
            render: (_args, dirs) => {
                if (dirs.length === 0) {
                    return [{ type: 'text', text: 'No directories associated.' }];
                }
                const lines = ['### Associated Workspace Directories:'];
                for (const directory of dirs) {
                    const readOnly = directory.readOnly ? ' `[Read-Only]`' : '';
                    const primary = directory.source === 'primary' ? ' **(Primary Root)**' : '';
                    const description = directory.description ? ` - ${directory.description}` : '';
                    lines.push(`- **[${directory.alias}]** \`${directory.path}\`${primary}${readOnly}${description}`);
                }
                return [{ type: 'text', text: lines.join('\n') }];
            }
        },
        isConcurrencySafe: () => true,
        async execute(_args, exec) {
            const sessionId = exec.agent?.session.id;
            return service.list(sessionId).map(toToolDirectory);
        }
    });
}

export function createAddTool(service: WorkspaceDirectoriesService, toolName = 'addir_add') {
    return defineTool({
        name: toolName,
        description:
            'Associate an additional directory with the current workspace. Allows reading, searching, and operating on code in that directory. Inspired by Codex --add-dir.',
        parameters: {
            path: {
                type: 'string',
                required: true,
                description: 'Absolute or relative path to the directory to link.'
            },
            alias: {
                type: 'string',
                description: 'Optional semantic alias (e.g. "backend", "docs", "core-lib").'
            },
            description: {
                type: 'string',
                description: 'Optional brief description of what the directory contains.'
            },
            readOnly: {
                type: 'boolean',
                description: 'Whether to protect this directory as read-only (default: false).'
            }
        },
        output: {
            schema: directorySchema,
            render: (_args, directory) => {
                const readOnly = directory.readOnly ? ' (Read-Only)' : '';
                return [
                    {
                        type: 'text',
                        text: `Successfully linked directory: [${directory.alias}] "${directory.path}"${readOnly}`
                    }
                ];
            }
        },
        isConcurrencySafe: () => false,
        async execute(args, exec) {
            const sessionId = exec.agent?.session.id;
            const addOptions: AddDirectoryOptions = {
                path: String(args.path),
                ...(args.alias ? { alias: String(args.alias) } : {}),
                ...(args.description ? { description: String(args.description) } : {}),
                readOnly: typeof args.readOnly === 'boolean' ? args.readOnly : false
            };
            const added = await service.add(addOptions, sessionId);
            return toToolDirectory(added);
        }
    });
}

export function createRemoveTool(service: WorkspaceDirectoriesService, toolName = 'addir_remove') {
    return defineTool({
        name: toolName,
        description: 'Remove a linked directory from the current workspace by path or alias. The primary workspace root cannot be removed.',
        parameters: {
            pathOrAlias: {
                type: 'string',
                required: true,
                description: 'The directory path or alias to unlink.'
            }
        },
        output: {
            schema: { type: 'boolean' },
            render: (args, success) => [
                {
                    type: 'text',
                    text: success
                        ? `Successfully unlinked directory "${args.pathOrAlias}".`
                        : `Failed to unlink directory "${args.pathOrAlias}" (not found or not un-linkable).`
                }
            ]
        },
        isConcurrencySafe: () => false,
        async execute(args, exec) {
            const sessionId = exec.agent?.session.id;
            return service.remove(String(args.pathOrAlias), sessionId);
        }
    });
}
