import { useEffect, useState, useSyncExternalStore } from 'react';
import { ProviderRoute } from '../../../../shared/constants/runtime.ts';
import type { ModelDirectories, ModelSelectionSource, ModelSelectionState } from '../modelSelectionSource.ts';
import { selectedModels } from '../modelSelectionSource.ts';
import { type OpenAICodexController, useCodexState } from '../openAICodexRuntime.ts';
import { useCodexAccountPolling } from './useCodexAccountPolling.ts';

const empty: ModelSelectionState = {};
const noSelection: ModelSelectionSource['store'] = { getSnapshot: () => empty, subscribe: () => () => undefined };
function sourceFor(directories: ModelDirectories, sessionId: string | undefined): ModelSelectionSource | undefined {
    if (!sessionId) return undefined;
    try {
        return directories.directoryFor(sessionId);
    } catch {
        return undefined;
    }
}
export function useCodexQuotaDock(controller: OpenAICodexController, directories: ModelDirectories, sessionId?: string) {
    const source = sourceFor(directories, sessionId);
    const store = source?.store ?? noSelection;
    const selection = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const state = useCodexState(controller);
    const [now, setNow] = useState(Date.now);
    const selected = selection.routable === true && selection.current?.provider === ProviderRoute ? selection.current : undefined;
    const account = state.snapshot?.accounts.find(
        item =>
            item.loggedIn &&
            selected?.model.startsWith(`${item.accountLabel}/`) &&
            item.models.some(model => model.enabled && `${item.accountLabel}/${model.id}` === selected.model)
    );
    useEffect(() => {
        if (document.visibilityState === 'visible') void controller.load(true);
        if (source && document.visibilityState === 'visible') void source.load().catch(() => undefined);
    }, [controller, source]);
    const provider = selected?.provider;
    const model = selected?.model;
    const accountLabel = account?.accountLabel;
    useEffect(() => {
        if (!provider || !model || !accountLabel) return undefined;
        return selectedModels.retain({ provider, model });
    }, [accountLabel, model, provider]);
    const updatedAt = account?.usageUpdatedAt ?? 0;
    const autoRefresh = account?.autoRefreshLimits;
    useEffect(() => {
        if (!autoRefresh || !updatedAt) return undefined;
        const timer = setTimeout(() => setNow(Date.now()), Math.max(0, updatedAt + 600000 - Date.now()));
        return () => clearTimeout(timer);
    }, [autoRefresh, updatedAt]);
    useCodexAccountPolling(account, controller);
    return {
        account,
        visible: updatedAt > 0 && (!autoRefresh || now - updatedAt < 600000)
    };
}
