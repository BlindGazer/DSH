import { useLayoutEffect, useRef, useState } from 'react';
import type { LoggerSanitizerRulesProps } from './LoggerSanitizerRules.tsx';

export function useLoggerSanitizerRules({ rules, onChange }: LoggerSanitizerRulesProps) {
    const pendingFocus = useRef<string | undefined>(undefined);
    const [rowIds, setRowIds] = useState(() => ({
        keys: (rules?.keys ?? []).map(() => crypto.randomUUID()),
        paths: (rules?.paths ?? []).map(() => crypto.randomUUID())
    }));
    if (rowIds.keys.length !== (rules?.keys?.length ?? 0) || rowIds.paths.length !== (rules?.paths?.length ?? 0)) {
        setRowIds(ids => ({
            keys: (rules?.keys ?? []).map((_entry, position) => ids.keys[position] ?? crypto.randomUUID()),
            paths: (rules?.paths ?? []).map((_entry, position) => ids.paths[position] ?? crypto.randomUUID())
        }));
    }
    useLayoutEffect(() => {
        if (!pendingFocus.current) return;
        document.getElementById(pendingFocus.current)?.focus();
        pendingFocus.current = undefined;
    });
    const update = (kind: 'keys' | 'paths', values: readonly string[]): void => {
        const next = { ...rules, [kind]: values };
        onChange(next.keys?.length || next.paths?.length ? next : undefined);
    };
    return {
        rowIds,
        update,
        add: (kind: 'keys' | 'paths') => {
            const id = crypto.randomUUID();
            pendingFocus.current = id;
            setRowIds(ids => ({ ...ids, [kind]: [...ids[kind].slice(0, rules?.[kind]?.length ?? 0), id] }));
            update(kind, [...(rules?.[kind] ?? []), '']);
        },
        remove: (kind: 'keys' | 'paths', index: number) => {
            setRowIds(ids => ({ ...ids, [kind]: ids[kind].filter((_id, position) => position !== index) }));
            update(
                kind,
                (rules?.[kind] ?? []).filter((_item, position) => position !== index)
            );
        }
    };
}
