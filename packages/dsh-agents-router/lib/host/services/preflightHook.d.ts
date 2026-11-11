type HookContext = Parameters<typeof currentDirectory>[0];
type HookState = Parameters<typeof refreshState>[2];
type HookStore = Parameters<typeof refreshState>[1];
type HookAgent = Parameters<typeof currentDirectory>[2];
interface HookExec {
    agent?: HookAgent;
    callId: string;
    name: string;
    parent?: string;
    rootCallId?: string;
    arguments: Record<string, string | undefined>;
}
type HookNext<TResult> = () => Promise<TResult>;
type HookDenyResult = Awaited<ReturnType<typeof denyCalls>> | {
    kind: 'deny';
    reason: string;
};
import { currentDirectory, denyCalls, refreshState } from './sessionController.js';
export declare function createPreflightHook<TResult>(ctx: HookContext, store: HookStore, states: Map<string, HookState>, pendingFeedback: Map<string, string>): (exec: HookExec, next: HookNext<TResult>) => Promise<TResult | HookDenyResult>;
export {};
