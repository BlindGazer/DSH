import { ensureCoreStyles, type FieldValidator } from '@kalex/dsh-core';
import { useEffect, useId, useState } from 'react';
import type { LoggerConfig } from '../shared/index.ts';
import type { LoggerManagementPanelProps } from './LoggerManagementPanel.tsx';

const validateLimit: FieldValidator<number | undefined> = value =>
    value !== undefined && (!Number.isSafeInteger(value) || value < 1024) ? 'limitError' : undefined;

export function useLoggerPanel(props: LoggerManagementPanelProps) {
    useEffect(() => {
        ensureCoreStyles();
    }, []);
    const [reloadConfirming, setReloadConfirming] = useState(false);
    const [original] = useState(props.config);
    const baseline = props.savedConfig ?? original;
    const [pathDraft, setPathDraft] = useState(props.config.path ?? '');
    const [confirming, setConfirming] = useState(false);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<readonly string[]>([]);
    const pathChanged = pathDraft !== (baseline.path ?? '');
    const next: LoggerConfig = pathChanged ? { ...props.config, path: pathDraft } : props.config;
    const dirty = pathChanged || JSON.stringify(props.config) !== JSON.stringify(baseline);
    const pathId = useId();
    const previewMatches = props.previewDraft === pathDraft;
    const previewReady = props.pathPreviewStatus === 'ready' && previewMatches && props.pathPreview !== undefined;
    const [confirmedPath, setConfirmedPath] = useState<string>();
    const pathError =
        !props.busy && (confirming || confirmedPath === pathDraft) && previewMatches && props.pathPreviewStatus === 'error'
            ? props.pathError
            : undefined;
    useEffect(() => {
        if (pathError) document.getElementById(pathId)?.focus();
    }, [pathError, pathId]);
    const [validateLimits, setValidateLimits] = useState(false);
    const limitId = `${pathId}-limit`;
    const pluginLimitId = (name: string): string => `${limitId}-${encodeURIComponent(name)}`;
    const [focusId, setFocusId] = useState<string>();
    useEffect(() => {
        if (focusId) document.getElementById(focusId)?.focus();
    }, [focusId]);
    const submit = (): void => {
        if (!dirty || props.busy || props.loading) return;
        setValidateLimits(true);
        if (validateLimit(props.config.maxFileBytes)) {
            document.getElementById(limitId)?.focus();
            return;
        }
        const invalidPlugin = Object.entries(props.config.plugins ?? {}).find(([, policy]) => validateLimit(policy.maxFileBytes));
        if (invalidPlugin) {
            const [name] = invalidPlugin;
            setSearch('');
            setExpanded(values => (values.includes(name) ? values : [...values, name]));
            const id = pluginLimitId(name);
            document.getElementById(id)?.focus();
            setFocusId(id);
            return;
        }
        if (pathChanged) {
            setConfirming(true);
            props.onPreviewPath?.(pathDraft);
        } else props.onSave?.(next);
    };
    const cancelPath = (): void => {
        setConfirming(false);
        setPathDraft(baseline.path ?? '');
        const { path: _removed, ...rest } = props.config;
        props.onChange(baseline.path === undefined ? rest : { ...rest, path: baseline.path });
    };
    const confirmPath = (): void => {
        if (!previewReady) return;
        if (props.onPathChange && !props.onPathChange(pathDraft)) return;
        setConfirmedPath(pathDraft);
        props.onSave?.(next);
        setConfirming(false);
    };
    return {
        reloadConfirming,
        cancelReload: () => setReloadConfirming(false),
        confirmReload: () => {
            setReloadConfirming(false);
            props.onReload?.();
        },
        reload: () => {
            if (props.busy || props.loading) return;
            if (dirty) setReloadConfirming(true);
            else props.onReload?.();
        },
        search,
        setSearch,
        expanded,
        toggle: (name: string) =>
            setExpanded(values => (values.includes(name) ? values.filter(value => value !== name) : [...values, name])),
        pathId,
        limitId,
        pluginLimitId,
        invalidLimit: (value: number | undefined) => validateLimits && validateLimit(value),
        pathError,
        pathDraft,
        setPathDraft: (value: string) => {
            setConfirming(false);
            setConfirmedPath(undefined);
            setPathDraft(value);
        },
        checkingPath: confirming && previewMatches && props.pathPreviewStatus === 'loading',
        confirming: confirming && previewReady,
        previewReady,
        dirty,
        submit,
        cancelPath,
        confirmPath,
        cancel: () => {
            setConfirmedPath(undefined);
            setValidateLimits(false);
            setFocusId(undefined);
            props.onChange(baseline);
            setPathDraft(baseline.path ?? '');
            setConfirming(false);
        }
    };
}
