import type { JsonValue } from '@kalex/dsh-logger-core';
import type { RuntimeValue, SanitizerRules } from './index.ts';

const BASE_KEYS = ['token', 'authorization', 'cookie', 'password', 'secret', 'credential', 'api_key'];
const MAX_DEPTH = 8;
const MAX_STRING = 4096;
const TRUNCATED = '[Truncated]';
const CIRCULAR = '[Circular]';
type SanitizedValue = JsonValue | undefined;

export function sanitizeValue(value: RuntimeValue, rules: SanitizerRules = {}): JsonValue {
    const keys = new Set([...BASE_KEYS, ...(rules.keys ?? [])].map(key => key.toLowerCase().trim()));
    const paths = new Set(rules.paths ?? []);
    const ancestors = new WeakSet<object>();
    return visit(value, 0, [], keys, paths, ancestors) ?? null;
}

function visit(
    value: RuntimeValue,
    depth: number,
    path: string[],
    keys: Set<string>,
    paths: Set<string>,
    ancestors: WeakSet<object>
): SanitizedValue {
    if (depth > MAX_DEPTH) return TRUNCATED;
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return undefined;
    if (value === null) return null;
    if (typeof value === 'bigint') return '[BigInt]';
    if (value instanceof Error) {
        return {
            name: truncateString(value.name),
            message: truncateString(value.message)
        };
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return Object.is(value, -0) ? 0 : value;
    }
    if (typeof value === 'string') return truncateString(value);
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'object') return undefined;
    if (ancestors.has(value)) return CIRCULAR;
    ancestors.add(value);
    if (Array.isArray(value)) {
        const result: JsonValue[] = [];
        for (const [index, item] of value.entries()) {
            const childPath = [...path, String(index)];
            if (paths.has(childPath.join('.'))) continue;
            const child = visit(item, depth + 1, childPath, keys, paths, ancestors);
            if (child !== undefined) result.push(child);
        }
        ancestors.delete(value);
        return result;
    }
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).toSorted()) {
        const childPath = [...path, key].join('.');
        const normalizedKey = key.toLowerCase();
        if (isSensitiveKey(normalizedKey, keys) || paths.has(childPath)) continue;
        const child = visit(value[key], depth + 1, [...path, key], keys, paths, ancestors);
        if (child !== undefined) result[key] = child;
    }
    ancestors.delete(value);
    return result;
}

function isSensitiveKey(key: string, keys: Set<string>): boolean {
    for (const sensitiveKey of keys) {
        if (sensitiveKey !== '' && key.includes(sensitiveKey)) return true;
    }
    return false;
}

function truncateString(value: string): string {
    return Array.from(value).slice(0, MAX_STRING).join('');
}

export function serializeJson(value: RuntimeValue, rules: SanitizerRules = {}): string {
    return JSON.stringify(sanitizeValue(value, rules));
}
