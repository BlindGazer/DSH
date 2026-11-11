import { open } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { NormalizedRuleMetadata, RawRuleFrontmatter, RuleActivationMode, SourceVendor } from '../../shared/models/RouterModels.js';
import { isRecord, validProjectFilter } from '../../shared/utils/validation.js';
import { normalizeRulePatterns, sanitizeFrontmatterYaml } from './globNormalizer.js';

const RULE_FIELDS = new Set(['path', 'paths', 'glob', 'globs', 'alwaysApply', 'description', 'enabled']);
// Skill fields include Agent Skills standard (name, description, license, compatibility, metadata, allowed-tools)
// plus DSH extensions (disable-model-invocation, user-invocable, enabled, whenToUse).
const SKILL_FIELDS = new Set([
    'name',
    'description',
    'license',
    'compatibility',
    'metadata',
    'allowed-tools',
    'disable-model-invocation',
    'user-invocable',
    'enabled',
    'whenToUse'
]);
const MAX_FRONTMATTER_BYTES = 64 * 1024;

interface InstructionMetadata {
    path: readonly string[];
    description?: string;
    enabled: boolean;
    name?: string;
    whenToUse?: string;
    metadata?: Record<string, string | number | boolean | object | undefined>;
    modelInvocable?: boolean;
    userInvocable?: boolean;
    license?: string;
    compatibility?: string;
    'allowed-tools'?: readonly string[];
    'disable-model-invocation'?: boolean | string | number;
    'user-invocable'?: boolean | string | number;
}

interface RawInstructionMetadata extends RawRuleFrontmatter {
    enabled?: boolean | string | number;
    name?: string;
    whenToUse?: string;
    metadata?: Record<string, string | number | boolean | object | undefined>;
    license?: string;
    compatibility?: string;
    'allowed-tools'?: readonly string[];
    'disable-model-invocation'?: boolean | string | number;
    'user-invocable'?: boolean | string | number;
}

interface RuleInstructionMetadata extends InstructionMetadata, NormalizedRuleMetadata {}

export interface RuleParseContext {
    readonly sourcePath?: string;
    readonly sourceVendor?: SourceVendor;
    readonly forceAlwaysApply?: boolean;
    readonly defaultAlwaysApply?: boolean;
}

interface SkillInstructionMetadata extends InstructionMetadata {
    description: string;
    modelInvocable: boolean;
    userInvocable: boolean;
}

interface ParsedInstruction<TMetadata extends InstructionMetadata = InstructionMetadata> {
    metadata: TMetadata;
    content: string;
}

export class MetadataError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MetadataError';
    }
}

/** Parse an optional YAML frontmatter block and validate supported metadata. */
export function parseInstruction(text: string, kind: 'rule', context?: RuleParseContext): ParsedInstruction<RuleInstructionMetadata>;
export function parseInstruction(text: string, kind: 'skill'): ParsedInstruction<SkillInstructionMetadata>;
export function parseInstruction(
    text: string,
    kind: 'rule' | 'skill',
    context?: RuleParseContext
): ParsedInstruction<RuleInstructionMetadata> | ParsedInstruction<SkillInstructionMetadata> {
    // Check if text starts with YAML frontmatter delimiter
    const frontmatterStart = /^(?:\uFEFF)?---[ \t]*\r?\n/.exec(text);
    if (frontmatterStart) {
        // Opening --- found, now look for closing ---
        const remaining = text.slice(frontmatterStart[0].length);
        const endMatch = /^([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(remaining);
        if (!endMatch) {
            // Opening --- found but closing --- missing: malformed frontmatter
            throw new MetadataError('YAML frontmatter opening delimiter without closing delimiter');
        }
        const rawMetadata = parseObject(endMatch[1] ?? '', kind === 'rule');
        const allowed = kind === 'skill' ? SKILL_FIELDS : RULE_FIELDS;
        for (const key of Object.keys(rawMetadata)) {
            if (!allowed.has(key)) throw new MetadataError(`unrecognized ${kind} frontmatter field "${key}"`);
        }

        if (rawMetadata.description !== undefined && typeof rawMetadata.description !== 'string') {
            throw new MetadataError('frontmatter field "description" must be a string');
        }
        const source = text.slice(frontmatterStart[0].length + endMatch[0].length);
        if (kind === 'rule') return { metadata: buildRuleMetadata(rawMetadata, context), content: source };

        const filters = [
            ...(rawMetadata.path === undefined || rawMetadata.path === '' || Object.is(rawMetadata.path, null)
                ? []
                : Array.isArray(rawMetadata.path)
                  ? rawMetadata.path
                  : [rawMetadata.path]),
            ...(rawMetadata.paths === undefined || rawMetadata.paths === '' || Object.is(rawMetadata.paths, null)
                ? []
                : Array.isArray(rawMetadata.paths)
                  ? rawMetadata.paths
                  : [rawMetadata.paths])
        ];
        if (!filters.every(validProjectFilter)) {
            throw new MetadataError('frontmatter fields "path" and "paths" must contain non-empty project-relative paths');
        }
        const pathFilters = [...new Set(filters)];
        const { paths: legacyPaths, metadata: rawSkillMetadata, ...supportedMetadata } = rawMetadata;
        void legacyPaths;
        const enabled = booleanField(rawMetadata.enabled, 'enabled', true);
        const metadata: InstructionMetadata = {
            ...supportedMetadata,
            path: pathFilters,
            enabled,
            ...(rawSkillMetadata === undefined ? {} : { metadata: rawSkillMetadata })
        };
        if (typeof rawMetadata.description !== 'string' || rawMetadata.description.trim() === '') {
            throw new MetadataError('skill frontmatter requires a non-empty "description"');
        }
        if (
            rawMetadata.name !== undefined &&
            (typeof rawMetadata.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawMetadata.name))
        ) {
            throw new MetadataError('skill frontmatter field "name" must be a lowercase kebab-case name');
        }
        if (rawMetadata.whenToUse !== undefined && typeof rawMetadata.whenToUse !== 'string') {
            throw new MetadataError('skill frontmatter field "whenToUse" must be a string');
        }
        if (rawMetadata.metadata !== undefined && !isRecord(rawMetadata.metadata)) {
            throw new MetadataError('skill frontmatter field "metadata" must be an object');
        }
        const skillMetadata: SkillInstructionMetadata = {
            ...metadata,
            description: rawMetadata.description,
            modelInvocable: !booleanField(rawMetadata['disable-model-invocation'], 'disable-model-invocation', false),
            userInvocable: booleanField(rawMetadata['user-invocable'], 'user-invocable', true)
        };
        return { metadata: skillMetadata, content: source };
    }
    if (kind === 'skill') throw new MetadataError('skill frontmatter requires a non-empty "description"');
    return { metadata: buildRuleMetadata({}, context), content: text };
}

/** Read and parse only SKILL.md frontmatter; the body is deferred until invocation. */
export async function readSkillMetadata(filePath: string): Promise<SkillInstructionMetadata> {
    const handle = await open(filePath, 'r');
    try {
        const chunk = Buffer.alloc(4096);
        let bytes = Buffer.alloc(0);
        let position = 0;
        while (bytes.length <= MAX_FRONTMATTER_BYTES) {
            const { bytesRead } = await handle.read(chunk, 0, chunk.length, position);
            if (bytesRead === 0) break;
            bytes = Buffer.concat([bytes, chunk.subarray(0, bytesRead)]);
            position += bytesRead;
            const text = bytes.toString('utf8');
            const match = /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
            if (match) return parseInstruction(match[0], 'skill').metadata;
        }
        if (bytes.length > MAX_FRONTMATTER_BYTES) throw new MetadataError('skill frontmatter exceeds 64 KiB');
        return parseInstruction(bytes.toString('utf8'), 'skill').metadata;
    } finally {
        await handle.close();
    }
}

function buildRuleMetadata(rawMetadata: RawInstructionMetadata, context?: RuleParseContext): RuleInstructionMetadata {
    const pathValues = [...patternField(rawMetadata.path, 'path'), ...patternField(rawMetadata.paths, 'paths')];
    const globValues = [...patternField(rawMetadata.glob, 'glob'), ...patternField(rawMetadata.globs, 'globs')];
    if (![...pathValues, ...globValues].every(validProjectFilter)) {
        throw new MetadataError('frontmatter fields "path", "paths", "glob", and "globs" must contain non-empty project-relative paths');
    }
    const pathFilters = [...new Set(pathValues)];
    const globs = normalizeRulePatterns(rawMetadata);
    if (!globs.every(validProjectFilter)) {
        throw new MetadataError('frontmatter fields "path", "paths", "glob", and "globs" must contain non-empty project-relative paths');
    }

    const explicitlyAlwaysApply = booleanField(rawMetadata.alwaysApply, 'alwaysApply', false);
    const sourcePath = context?.sourcePath?.replaceAll('\\', '/');
    const isRootInstruction =
        sourcePath !== undefined &&
        !sourcePath.includes('/') &&
        ['agent.md', 'agents.md', 'claude.md', '.cursorrules'].includes(sourcePath.toLowerCase()) &&
        globs.length === 0;
    const defaultAlwaysApply =
        rawMetadata.alwaysApply === undefined &&
        context?.defaultAlwaysApply === true &&
        globs.length === 0 &&
        !rawMetadata.description?.trim();
    const alwaysApply = context?.forceAlwaysApply === true || explicitlyAlwaysApply || isRootInstruction || defaultAlwaysApply;
    const activationMode: RuleActivationMode = alwaysApply
        ? 'always'
        : globs.length
          ? 'glob'
          : rawMetadata.description?.trim()
            ? 'agent-requested'
            : 'manual';

    return {
        path: pathFilters,
        enabled: booleanField(rawMetadata.enabled, 'enabled', true),
        globs,
        alwaysApply,
        activationMode,
        ...(rawMetadata.description === undefined ? {} : { description: rawMetadata.description }),
        ...(context?.sourceVendor === undefined ? {} : { sourceVendor: context.sourceVendor })
    };
}

function patternField(value: string | string[] | undefined, field: string): string[] {
    if (value === undefined || Object.is(value, null) || value === '') return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value) && value.every(entry => typeof entry === 'string')) return value;
    throw new MetadataError(`frontmatter field "${field}" must contain strings`);
}

function quotePathGlobs(source: string): string {
    let listIndent: number | undefined;
    return source
        .split(/\r?\n/)
        .map(line => {
            const scalar = /^([ \t]*(?:globs?|paths?):[ \t]*)(![^ \t#]+)([ \t]*(?:#.*)?)$/.exec(line);
            if (scalar?.[1] !== undefined && scalar[2] !== undefined && scalar[3] !== undefined)
                return `${scalar[1]}"${scalar[2]}"${scalar[3]}`;
            const field = /^([ \t]*)(?:globs?|paths?):[ \t]*(?:#.*)?$/.exec(line);
            if (field?.[1] !== undefined) {
                listIndent = field[1].length;
                return line;
            }
            if (listIndent === undefined || !line.trim()) return line;
            const indent = line.match(/^[ \t]*/)?.[0].length ?? 0;
            if (indent <= listIndent) {
                listIndent = undefined;
                return line;
            }
            return line.replace(/^([ \t]*-[ \t]+)([!*?][^ \t#]*)([ \t]*(?:#.*)?)$/, '$1"$2"$3');
        })
        .join('\n');
}

function parseObject(source: string, sanitizeGlobs: boolean): RawInstructionMetadata {
    try {
        const sanitized = sanitizeGlobs ? sanitizeFrontmatterYaml(source) : source;
        const value = parseYaml(quotePathGlobs(sanitized));
        if (value === null || value === undefined) return {};
        if (!isRecord(value)) throw new MetadataError('YAML frontmatter must be a mapping');
        return value as RawInstructionMetadata;
    } catch (error) {
        if (error instanceof MetadataError) throw error;
        throw new MetadataError(`invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function booleanField(value: boolean | string | number | undefined, field: string, fallback: boolean): boolean {
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1') return true;
    if (value === 0 || value === '0') return false;
    if (typeof value === 'string') {
        switch (value.toLowerCase()) {
            case 'true':
            case 'yes':
            case 'on':
                return true;
            case 'false':
            case 'no':
            case 'off':
                return false;
        }
    }
    throw new MetadataError(`frontmatter field "${field}" must be a boolean`);
}
