import type { DiscoveredSkill, RouterDiagnostic } from '../../shared/models/RouterModels.js';
import type { RouterStore } from './store.js';
interface CancellationSignal {
    throwIfAborted(): void;
}
interface ProjectSkillCandidate {
    readonly path: string;
    readonly name: string;
    readonly description: string | undefined;
    readonly whenToUse?: string;
    readonly invocation: DiscoveredSkill['invocation'];
    readonly source: 'project-agents';
    readonly provider: string;
    readonly resourceBase: {
        readonly kind: 'directory';
        readonly path: string;
    };
    readonly rank: number;
    readonly locator: {
        readonly name: string;
        readonly sourcePath: string;
    };
    readonly metadata?: DiscoveredSkill['metadata'];
}
interface ProjectSkill {
    readonly path: string;
    readonly name: string;
    readonly description: string | undefined;
    readonly whenToUse?: string;
    readonly invocation: DiscoveredSkill['invocation'];
    readonly source: 'project-agents';
    readonly provider: string;
    readonly resourceBase: {
        readonly kind: 'directory';
        readonly path: string;
    };
    readonly content: string | undefined;
    readonly metadata?: DiscoveredSkill['metadata'];
}
interface ProviderOptions {
    readonly signal?: CancellationSignal;
}
interface SkillProviderControl {
    readonly signal: CancellationSignal;
    invalidate(): void;
}
interface SkillProviderScope {
    readonly skills: {
        registerProvider(factory: (control: SkillProviderControl) => {
            readonly name: string;
            list(options: ProviderOptions): Promise<{
                readonly candidates: ProjectSkillCandidate[];
                readonly complete: boolean;
            }>;
            get(candidate: ProjectSkillCandidate, options: ProviderOptions): Promise<ProjectSkill | undefined>;
        }): void;
    };
}
export interface ScopedAgent {
    readonly ctx: {
        inject(keys: readonly string[], action: (scope: SkillProviderScope) => void): Promise<void>;
    };
}
interface SkillHostContext {
    readonly skills: {
        list(options: {
            readonly cwd: string;
            readonly signal?: CancellationSignal | undefined;
        }): Promise<{
            readonly name: string;
            readonly provider?: string;
            readonly path?: string;
        }[]>;
    };
}
/** Register this provider inside one Agent scope so its skills stay project-bound. */
export declare function registerSkillsProvider(agent: ScopedAgent, rootContext: SkillHostContext, projectRoot: string, store: RouterStore, reportDiagnostics?: (items: RouterDiagnostic[]) => Promise<RouterDiagnostic[]>): Promise<() => void>;
export {};
