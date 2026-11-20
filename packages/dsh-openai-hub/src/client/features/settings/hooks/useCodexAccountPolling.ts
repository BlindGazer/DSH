import { useEffect, useSyncExternalStore } from 'react';
import { ProviderRoute } from '../../../../shared/constants/runtime.js';
import type { AccountSnapshot } from '../../../../shared/remote.js';
import { selectedModels } from '../modelSelectionSource.js';
import type { OpenAICodexController } from '../openAICodexRuntime.js';
import { retainQuotaPolling } from '../quotaPolling.js';

export function usageRefreshInterval(account: AccountSnapshot, selectedModel?: string): number {
    if (!selectedModel) return 300000;
    const limits = account.usageLimits.filter(
        limit =>
            limit.name === 'Codex' ||
            selectedModel.toLowerCase().includes(limit.name.toLowerCase()) ||
            limit.name.toLowerCase().includes(selectedModel.toLowerCase())
    );
    const selectedWindow = [3600, 18000, 86400].find(windowSeconds => limits.some(limit => limit.windowSeconds === windowSeconds));
    const limit = limits
        .filter(item => selectedWindow === undefined || item.windowSeconds === selectedWindow)
        .toSorted((a, b) => a.resetAt - b.resetAt)[0];
    return limit && 100 - limit.usedPercent < 25 ? 60000 : 300000;
}
export function useCodexAccountPolling(account: AccountSnapshot | undefined, controller: OpenAICodexController): void {
    const selections = useSyncExternalStore(selectedModels.subscribe, selectedModels.getSnapshot, selectedModels.getSnapshot);
    const prefix = `${account?.accountLabel}/`;
    const selected = selections.find(selection => selection.provider === ProviderRoute && selection.model.startsWith(prefix));
    const delay = account ? usageRefreshInterval(account, selected?.model.slice(prefix.length)) : 300000;
    const label = account?.accountLabel;
    const enabled = account?.autoRefreshLimits && account.loggedIn;
    useEffect(() => {
        if (!enabled || !label) return undefined;
        return retainQuotaPolling(controller, label, delay);
    }, [controller, delay, enabled, label]);
}
