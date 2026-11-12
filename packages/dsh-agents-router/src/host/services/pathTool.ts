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
    readonly parameters: Record<string, unknown>;
    readonly output: {
        readonly schema: object;
        readonly render: (args: PathToolArguments, value: PathToolOutput) => { readonly type: 'text'; readonly text: string }[];
    };
    readonly execute: (args: PathToolArguments, exec: { readonly agent?: RouterAgent }) => Promise<PathToolOutput>;
}

import { recordAudit } from './auditLogger.js';
import { projectPaths } from './preflight.js';

export function createPathTool(
    ctx: RouterHostContext,
    store: RouterStore,
    state: RouterState,
    {
        refreshState,
        currentDirectory
    }: {
        readonly refreshState: (ctx: RouterHostContext, store: RouterStore, state: RouterState) => Promise<RouterState>;
        readonly currentDirectory: (ctx: RouterHostContext, state: RouterState, agent: RouterAgent) => string;
    }
): PathToolDefinition {
    // tools.register accepts raw JSON Schema. Do not pass these schemas through
    // defineTool: that helper expects its authoring DSL, including for output.
    return {
        name: 'agents_router_paths',
        description:
            'Declare or release project files in the router workset. Use before opaque terminal or script access; native file tools are tracked automatically.',
        parameters: {
            type: 'object',
            required: ['action', 'paths'],
            properties: {
                action: { type: 'string', enum: ['add', 'release'] },
                paths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'File or directory paths relative to the current Session directory, or absolute paths.'
                }
            }
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                required: ['action', 'message', 'paths'],
                properties: {
                    action: { type: 'string' },
                    message: { type: 'string' },
                    paths: { type: 'array', items: { type: 'string' } }
                }
            },
            render: (_args, value) => [{ type: 'text', text: value.message }]
        },
        async execute(args, exec) {
            const agent = exec.agent;
            if (!agent || agent.id !== state.agent.id) throw new Error('agents_router_paths is only available in its owning DSH session');
            if (
                !args ||
                !['add', 'release'].includes(args.action) ||
                !Array.isArray(args.paths) ||
                args.paths.some(value => typeof value !== 'string')
            )
                throw new Error('agents_router_paths requires action add/release and an array of string paths');
            const cwd = currentDirectory(ctx, state, agent);
            const previousPaths = state.activePaths;
            const paths = new Set<string>();
            let ignored = 0;
            for (const raw of args.paths) {
                const resolved = await projectPaths(state.projectRoot, cwd, raw);
                if (!resolved.length) ignored++;
                for (const value of resolved) if (typeof value === 'string') paths.add(value);
            }
            const update = await store.updateSession(state.sessionId, state.projectRoot, session => {
                const entries = new Map(state.activePaths.map(value => [value.toLowerCase(), value]));
                if (args.action === 'add') {
                    for (const value of paths) entries.set(value.toLowerCase(), value);
                } else if (paths.has('.')) {
                    entries.clear();
                } else {
                    for (const value of paths) {
                        const key = value.toLowerCase().replace(/\/$/, '');
                        for (const existing of entries.keys())
                            if (existing === key || existing.startsWith(`${key}/`)) entries.delete(existing);
                    }
                }
                return { ...session, activePaths: [...entries.values()] };
            });
            state.activePaths = update.state.activePaths;
            state.forceEmptyWorkset = false;
            await refreshState(ctx, store, state);
            const added = state.activePaths.filter(item => !previousPaths.includes(item));
            const released = previousPaths.filter(item => !state.activePaths.includes(item));
            await recordAudit(state, store, {
                event: 'tool_call agents_router_paths',
                workset: `+added: [${added.join(', ')}] | -released: [${released.join(', ')}] | total: ${state.activePaths.length}`
            });
            state.invalidateSkills();
            const action = args.action === 'add' ? 'added' : 'released';
            const message = `${action} ${paths.size} project path(s)${ignored ? `; ignored ${ignored} path(s) outside this project` : ''}`;
            return { action: args.action, message, paths: [...paths] };
        }
    };
}
