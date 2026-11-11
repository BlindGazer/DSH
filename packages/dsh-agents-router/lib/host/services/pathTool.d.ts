import type { RouterAgent, RouterHostContext, RouterState } from './sessionController.js';
import type { RouterStore } from './store.js';
interface PathToolArguments {
    readonly action: 'add' | 'release';
    readonly paths: string[];
}
interface PathToolOutput {
    readonly action: 'add' | 'release';
    readonly message: string;
    readonly paths: string[];
}
interface PathToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, object>;
    readonly output: {
        readonly schema: object;
        readonly render: (args: PathToolArguments, value: PathToolOutput) => {
            readonly type: 'text';
            readonly text: string;
        }[];
    };
    readonly execute: (args: PathToolArguments, exec: {
        readonly agent?: RouterAgent;
    }) => Promise<PathToolOutput>;
}
export declare function createPathTool(ctx: RouterHostContext, store: RouterStore, state: RouterState, { refreshState, currentDirectory }: {
    readonly refreshState: (ctx: RouterHostContext, store: RouterStore, state: RouterState) => Promise<RouterState>;
    readonly currentDirectory: (ctx: RouterHostContext, state: RouterState, agent: RouterAgent) => string;
}): PathToolDefinition;
export {};
