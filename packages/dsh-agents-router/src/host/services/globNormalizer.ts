import type { RawRuleFrontmatter } from '../../shared/models/RouterModels.js';

const UNQUOTED_GLOB_LINE = /^(\s*(?:globs?|paths?)\s*:\s*)(.+)$/i;
const GLOB_META = /[*?[{!]/;

export function sanitizeFrontmatterYaml(rawFrontmatter: string): string {
    return rawFrontmatter
        .split(/\r?\n/)
        .map(line => {
            const match = UNQUOTED_GLOB_LINE.exec(line);
            if (!match) return line;
            const value = match[2]?.trim() ?? '';
            if (!value || /^[["']/.test(value) || /^(?:null|~)$/i.test(value)) return line;
            const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `${match[1]}"${escaped}"`;
        })
        .join('\n');
}

export function splitGlobString(input: string): string[] {
    const patterns: string[] = [];
    let token = '';
    let braceDepth = 0;
    let bracketDepth = 0;

    for (const character of input) {
        if (character === '{') braceDepth += 1;
        else if (character === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (character === '[') bracketDepth += 1;
        else if (character === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (character === ',' && braceDepth === 0 && bracketDepth === 0) {
            appendPattern(patterns, token);
            token = '';
        } else {
            token += character;
        }
    }
    appendPattern(patterns, token);
    return patterns;
}

export function normalizeRulePatterns(frontmatter: RawRuleFrontmatter): string[] {
    const patterns: string[] = [];
    appendValues(frontmatter.path, true, patterns);
    appendValues(frontmatter.paths, true, patterns);
    appendValues(frontmatter.glob, false, patterns);
    appendValues(frontmatter.globs, false, patterns);
    return [...new Set(patterns)];
}

function appendValues(value: string | string[] | undefined, legacyPath: boolean, patterns: string[]): void {
    const values = typeof value === 'string' ? [value] : (value ?? []);
    for (const item of values) {
        for (const pattern of splitGlobString(item)) {
            if (legacyPath && !GLOB_META.test(pattern)) {
                const directory = pattern.replace(/\/+$/, '');
                const filename = directory.slice(directory.lastIndexOf('/') + 1);
                const extension = filename.lastIndexOf('.');
                if (directory && (extension <= 0 || extension === filename.length - 1)) {
                    patterns.push(directory, `${directory}/**`);
                    continue;
                }
            }
            patterns.push(pattern);
        }
    }
}

function appendPattern(patterns: string[], source: string): void {
    let pattern = source.trim().replaceAll('\\', '/');
    if (pattern.startsWith('!./')) pattern = `!${pattern.slice(3)}`;
    else pattern = pattern.replace(/^\.\//, '');
    if (pattern) patterns.push(pattern);
}
