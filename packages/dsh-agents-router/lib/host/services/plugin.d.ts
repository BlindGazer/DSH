import type { RouterAgent, RouterHostContext, RouterMessage } from './sessionController.js';
import type { ScopedAgent } from './skillsProvider.js';
import { createRouterHandler } from '../api/httpRoutes.js';
import { filterRootInstructionMessages } from './instructionRedirection.js';
import { createPathTool as makePathTool } from './pathTool.js';
import { createPreflightHook } from './preflightHook.js';
interface AbortSignalLike {
    readonly aborted: boolean;
    throwIfAborted(): void;
}
interface PromptContext {
    readonly name: string;
    readonly text?: string;
    readonly interpolate?: boolean;
}
interface PromptAssembly {
    readonly contexts: PromptContext[];
}
interface PreStepDecision {
    readonly kind: string;
    readonly messages: ReturnType<typeof filterRootInstructionMessages>;
}
interface AgentEvents {
    readonly 'system-prompt/assemble': (_assembly: object, _context: object, next: () => Promise<PromptAssembly>) => Promise<PromptAssembly>;
    readonly 'agent/pre-step': (_payload: object, next: () => Promise<PreStepDecision>) => Promise<PreStepDecision>;
}
interface PluginAgentContext {
    readonly inject: ScopedAgent['ctx']['inject'];
    readonly systemPrompt: {
        context(value: {
            readonly name: string;
            readonly order: number;
            readonly text: () => string;
            readonly required: boolean;
            readonly interpolate: boolean;
        }): void;
        section(value: {
            readonly name: string;
            readonly order: number;
            readonly interpolate: boolean;
            readonly text: string;
        }): void;
    };
    readonly tools: {
        register(tool: ReturnType<typeof makePathTool>): void;
    };
    on<K extends keyof AgentEvents>(event: K, callback: AgentEvents[K], options: {
        readonly prepend: boolean;
    }): void;
}
interface PluginAgent extends RouterAgent {
    readonly ctx: PluginAgentContext;
}
interface AgentCreatedEvent {
    readonly agent: PluginAgent;
    readonly source: string;
    readonly signal?: AbortSignalLike;
}
interface ToolExecution {
    readonly agent?: {
        readonly id: string;
    };
    readonly callId: string;
    readonly parent?: string;
}
interface ToolExecutionResult {
    readonly additionalContexts?: readonly RouterMessage[];
}
interface WorkspacePathController {
    canOpenWorkspacePath(): boolean;
    openWorkspacePath(request: {
        readonly action: 'reveal';
        readonly path: string;
    }, signal: AbortSignal): Promise<{
        readonly opened: true;
    }>;
}
interface WebServerScope {
    readonly webServer: {
        register(value: {
            readonly kind: 'prefix';
            readonly path: string;
            readonly handler: ReturnType<typeof createRouterHandler>;
        }): void;
    };
    effect(action: () => void, name: string): void;
}
interface PluginEvents {
    readonly 'agent/created': (payload: AgentCreatedEvent) => Promise<void>;
    readonly 'agent/disposed': (payload: {
        readonly agent: RouterAgent;
    }) => void;
    readonly 'tools/pre-execute': ReturnType<typeof createPreflightHook>;
    readonly 'tools/post-execute': (exec: ToolExecution, result: object, next: () => Promise<ToolExecutionResult>) => Promise<ToolExecutionResult>;
    readonly 'tools/result': (exec: ToolExecution) => void;
}
interface PluginContext extends RouterHostContext {
    readonly sessionController: WorkspacePathController;
    readonly agents: {
        list(): PluginAgent[];
    };
    on<K extends keyof PluginEvents>(event: K, callback: PluginEvents[K]): void;
    inject(keys: readonly string[], action: (scope: WebServerScope) => void): void;
}
export declare const name = "dsh-agents-router";
export declare const inject: string[];
export declare function apply(ctx: PluginContext): void;
export {};
