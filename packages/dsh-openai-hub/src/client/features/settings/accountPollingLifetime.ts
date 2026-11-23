import { ProviderRoute } from '../../../shared/constants/runtime.ts';
import { usageRefreshInterval } from './hooks/useCodexAccountPolling.ts';
import { selectedModels } from './modelSelectionSource.ts';
import type { OpenAICodexController } from './openAICodexRuntime.ts';
import { retainQuotaPolling } from './quotaPolling.ts';

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
            retained.set(account.accountLabel, { delay, release: retainQuotaPolling(controller, account.accountLabel, delay) });
            previous?.release();
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
