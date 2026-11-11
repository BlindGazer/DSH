import { isAbsolute, posix, relative, resolve, sep } from 'node:path';
import type { NormalizedRuleMetadata } from '../../shared/models/RouterModels.js';

const GLOB_META = /[?*[{]/;
const REGEX_META = new Set(['\\', '.', '^', '$', '+', '?', '(', ')', '[', ']', '{', '}', '|']);

/** Return a normalized, project-relative POSIX path or undefined if it escapes the root. */
export function projectRelativePath(projectRoot: string, candidate: string): string | undefined {
    if (typeof candidate !== 'string' || candidate.length === 0) return undefined;
    const root = resolve(projectRoot);
    const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate);
    const rel = relative(root, absolute);
    if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return undefined;
    return rel.split(sep).join('/');
}

/** Match a rule/area path filter against one project-relative path. */
export function matchesPath(candidate: string, filter: string | readonly string[] | undefined): boolean {
    return explainPathMatch(candidate, filter).matched;
}

/** Match normalized rule metadata using include, exclude, and basename glob semantics. */
export function matchesRule(rule: NormalizedRuleMetadata, targetPath: string): boolean {
    if (rule.alwaysApply) return true;
    if (rule.globs.length === 0) return false;

    const target = normalize(targetPath).replace(/^\/+/, '').toLowerCase();
    if (!target) return false;
    const patterns = rule.globs.map(pattern => normalize(pattern.trim()).toLowerCase()).filter(pattern => pattern.length > 0);
    if (!patterns.length) return false;

    const positive = patterns.filter(pattern => !pattern.startsWith('!'));
    const negative = patterns.filter(pattern => pattern.startsWith('!')).map(pattern => pattern.slice(1));
    const matchesAny = (candidates: readonly string[]): boolean => candidates.some(pattern => matchesGlob(target, pattern));
    return (positive.length === 0 || matchesAny(positive)) && !matchesAny(negative);
}

/** Explain the last matching include/exclude rule for a project-relative path. */
export function explainPathMatch(candidate: string, filter: string | readonly string[] | undefined): { matched: boolean; reason: string } {
    if (filter === undefined || filter === '' || (Array.isArray(filter) && filter.length === 0)) {
        return { matched: true, reason: 'unrestricted' };
    }
    const path = normalize(candidate).toLowerCase();
    const rawList = (Array.isArray(filter) ? filter : [filter]).filter(item => typeof item === 'string' && item.trim().length > 0);
    if (!rawList.length) return { matched: false, reason: 'invalid filter' };
    const parsed = rawList
        .map(raw => {
            const trimmed = raw.trim();
            const negated = trimmed.startsWith('!');
            return { raw: trimmed, negated, pattern: normalize(negated ? trimmed.slice(1).trim() : trimmed).toLowerCase() };
        })
        .filter(({ pattern }) => pattern.length > 0);
    if (!parsed.length) return { matched: false, reason: 'invalid filter' };
    const hasPositive = parsed.some(({ negated }) => !negated);
    let matched = !hasPositive;
    let lastMatchedRule = hasPositive ? undefined : 'implicit-all';
    let excludedBy: string | undefined;
    for (const item of parsed) {
        if (!matchesSinglePattern(path, item.pattern)) continue;
        if (item.negated) {
            matched = false;
            excludedBy = item.raw;
        } else {
            matched = true;
            lastMatchedRule = item.raw;
            excludedBy = undefined;
        }
    }
    return {
        matched,
        reason: matched ? `matched ${lastMatchedRule}` : excludedBy ? `excluded by ${excludedBy}` : 'path did not match'
    };
}

function matchesSinglePattern(path: string, pattern: string): boolean {
    if (pattern.endsWith('/')) return path.startsWith(pattern) || path === pattern.slice(0, -1);
    if (!GLOB_META.test(pattern)) return path === pattern;
    const target = pattern.includes('/') ? path : posix.basename(path);
    return matchesGlob(target, pattern);
}

function matchesGlob(target: string, pattern: string): boolean {
    if (!pattern) return false;
    try {
        const matcher = globRegex(pattern);
        return matcher.test(target) || (!pattern.includes('/') && matcher.test(posix.basename(target)));
    } catch {
        return false;
    }
}

function normalize(value: string): string {
    return value
        .replaceAll('\\', '/')
        .replace(/^\.\//, '')
        .replace(/\/{2,}/g, '/');
}

function globRegex(pattern: string): RegExp {
    return new RegExp(`^${globToSource(pattern)}$`);
}

function globToSource(pattern: string): string {
    let source = '';
    for (let index = 0; index < pattern.length; index += 1) {
        const character = pattern[index];
        if (character === undefined) continue;
        if (character === '*') {
            if (pattern[index + 1] === '*') {
                index += 1;
                if (pattern[index + 1] === '/') {
                    index += 1;
                    source += '(?:[^/]+/)*';
                } else {
                    source += '.*';
                }
            } else {
                source += '[^/]*';
            }
            continue;
        }
        if (character === '?') {
            source += '[^/]';
            continue;
        }
        if (character === '{') {
            const end = findClosingBrace(pattern, index);
            if (end >= 0) {
                const alternatives = splitBraceAlternatives(pattern.slice(index + 1, end));
                if (alternatives.length > 1) {
                    source += `(?:${alternatives.map(globToSource).join('|')})`;
                    index = end;
                    continue;
                }
            }
            source += '\\{';
            continue;
        }
        if (character === '[') {
            const end = pattern.indexOf(']', index + 1);
            if (end > index + 1) {
                const contents = pattern.slice(index + 1, end);
                const characterClass = contents.startsWith('!') && contents.length > 1 ? `^${contents.slice(1)}` : contents;
                source += `[${characterClass}]`;
                index = end;
                continue;
            }
            source += '\\[';
            continue;
        }
        if (character === '}' || REGEX_META.has(character)) source += `\\${character}`;
        else source += character;
    }
    return source;
}

function findClosingBrace(pattern: string, start: number): number {
    let depth = 0;
    for (let index = start; index < pattern.length; index += 1) {
        if (pattern[index] === '[') {
            const bracketEnd = pattern.indexOf(']', index + 1);
            if (bracketEnd >= 0) index = bracketEnd;
        } else if (pattern[index] === '{') {
            depth += 1;
        } else if (pattern[index] === '}') {
            depth -= 1;
            if (depth === 0) return index;
        }
    }
    return -1;
}

function splitBraceAlternatives(value: string): string[] {
    const alternatives: string[] = [];
    let token = '';
    let braceDepth = 0;
    let bracketDepth = 0;
    for (const character of value) {
        if (character === '{') braceDepth += 1;
        else if (character === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (character === '[') bracketDepth += 1;
        else if (character === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        if (character === ',' && braceDepth === 0 && bracketDepth === 0) {
            alternatives.push(token);
            token = '';
        } else {
            token += character;
        }
    }
    alternatives.push(token);
    return alternatives;
}
