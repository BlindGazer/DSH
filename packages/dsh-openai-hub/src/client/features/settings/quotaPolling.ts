import type { OpenAICodexController } from './openAICodexRuntime.ts';

interface PollingEntry {
    readonly owners: Map<symbol, number>;
    timer: ReturnType<typeof setInterval> | undefined;
    delay: number;
    busy: boolean;
    readonly refresh: () => void;
    readonly visibility: () => void;
}
const controllers = new WeakMap<OpenAICodexController, Map<string, PollingEntry>>();
function schedule(entry: PollingEntry): void {
    if (entry.timer !== undefined) clearInterval(entry.timer);
    entry.timer = undefined;
    if (document.visibilityState !== 'visible' || entry.owners.size === 0) return;
    entry.delay = Math.min(...entry.owners.values());
    entry.timer = setInterval(entry.refresh, entry.delay);
}
export function retainQuotaPolling(controller: OpenAICodexController, accountLabel: string, delay: number): () => void {
    let accounts = controllers.get(controller);
    if (!accounts) {
        accounts = new Map();
        controllers.set(controller, accounts);
    }
    let entry = accounts.get(accountLabel);
    if (!entry) {
        const created: PollingEntry = {
            owners: new Map(),
            timer: undefined,
            delay,
            busy: false,
            refresh: () => {
                if (document.visibilityState !== 'visible' || created.busy || !created.owners.size) return;
                created.busy = true;
                void controller
                    .refreshUsage(accountLabel)
                    .catch(() => undefined)
                    .finally(() => {
                        created.busy = false;
                    });
            },
            visibility: () => {
                schedule(created);
                if (document.visibilityState === 'visible') created.refresh();
            }
        };
        entry = created;
        accounts.set(accountLabel, entry);
        document.addEventListener('visibilitychange', entry.visibility);
    }
    const firstOwner = entry.owners.size === 0;
    const owner = Symbol();
    entry.owners.set(owner, delay);
    if (entry.timer === undefined || entry.delay !== Math.min(...entry.owners.values())) schedule(entry);
    const account = controller.getSnapshot().snapshot?.accounts.find(candidate => candidate.accountLabel === accountLabel);
    if (firstOwner && account && account.usageUpdatedAt <= 0) entry.refresh();
    const retained = entry;
    return () => {
        retained.owners.delete(owner);
        if (!retained.owners.size) {
            if (retained.timer !== undefined) clearInterval(retained.timer);
            document.removeEventListener('visibilitychange', retained.visibility);
            accounts.delete(accountLabel);
        } else if (retained.delay !== Math.min(...retained.owners.values())) schedule(retained);
    };
}
