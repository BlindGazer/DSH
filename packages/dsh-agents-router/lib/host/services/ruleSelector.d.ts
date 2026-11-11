import type { DiscoveredRule, ProjectDiscoverySnapshot } from '../../shared/models/RouterModels.js';
interface SelectedRule extends DiscoveredRule {
    readonly appliesTo: readonly string[];
    readonly path: readonly string[];
    readonly content: string;
}
/** Return managed rules matching active paths; unfiltered global rules are always included. */
export declare function selectRules(snapshot: ProjectDiscoverySnapshot, activePaths?: readonly string[]): SelectedRule[];
export declare function renderRules(rules: readonly SelectedRule[]): string;
/** Explain whether a project-relative file would activate each configured rule. */
export declare function diagnosePath(snapshot: ProjectDiscoverySnapshot, filePath: string): {
    rule: DiscoveredRule;
    applies: boolean;
    reason: string;
}[];
export declare function renderAreas(snapshot: ProjectDiscoverySnapshot): string;
export {};
