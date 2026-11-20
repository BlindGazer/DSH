import { ProviderRoute } from '../../../shared/constants/runtime.js';
import { usageRefreshInterval } from './hooks/useCodexAccountPolling.js';
import { selectedModels } from './modelSelectionSource.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import { retainQuotaPolling } from './quotaPolling.js';

interface RetainedAccount {
    readonly delay: number;
    readonly release: () => void;
}
export function startAccountPolling(controller: OpenAICodexController): () => void {
    const retained = new Map<string, RetainedAccount>();
    const sync = () => {
        const accounts = controller.getSnapshot().snapshot?.accounts.filter(account => account.autoRefreshLimits && account.loggedIn) ?? [];
        const selections = selectedModels.getSnapshot();
        for (const [label, owner] of retained)
            if (!accounts.some(account => account.accountLabel === label)) {
                owner.release();
                retained.delete(label);
            }
        for (const account of accounts) {
            const prefix = `${account.accountLabel}/`;
            const selection = selections.find(model => model.provider === ProviderRoute && model.model.startsWith(prefix));
            const delay = usageRefreshInterval(account, selection?.model.slice(prefix.length));
            const previous = retained.get(account.accountLabel);
            if (previous?.delay === delay) continue;
            previous?.release();
            retained.set(account.accountLabel, { delay, release: retainQuotaPolling(controller, account.accountLabel, delay) });
        }
    };
    const stopState = controller.subscribe(sync);
    const stopSelection = selectedModels.subscribe(sync);
    sync();
    void controller.load(true);
    return () => {
        stopState();
        stopSelection();
        for (const owner of retained.values()) owner.release();
        retained.clear();
    };
}
