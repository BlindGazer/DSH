import type { AreaDefinition, DiscoveredRule, DiscoveredSkill, ProjectSettings, RouterDiagnostic, SourceVendor } from '../../shared/models/RouterModels.js';
export declare const compare: (a: string, b: string) => number;
export interface RuleDiscoveryOptions {
    readonly sourceVendor?: SourceVendor;
    readonly forceAlwaysApply?: boolean;
    readonly defaultAlwaysApply?: boolean;
    readonly seenFiles?: Set<string>;
}
export declare function discoverAreaFolders(instructionsRoot: string, areas: Map<string, AreaDefinition>, settings: ProjectSettings, projectRoot: string, diagnostics: RouterDiagnostic[]): Promise<void>;
export declare function addRuleFile(filePath: string, area: string, projectRoot: string, rules: DiscoveredRule[], diagnostics: RouterDiagnostic[], optional: boolean, options?: RuleDiscoveryOptions): Promise<void>;
export declare function collectRules(directory: string, area: string, projectRoot: string, rules: DiscoveredRule[], diagnostics: RouterDiagnostic[], options?: RuleDiscoveryOptions): Promise<void>;
export declare function collectTopLevelRules(directory: string, area: string, projectRoot: string, rules: DiscoveredRule[], diagnostics: RouterDiagnostic[], options?: RuleDiscoveryOptions): Promise<void>;
export declare function collectCommandSkills(directory: string, projectRoot: string, skills: DiscoveredSkill[], diagnostics: RouterDiagnostic[], seenFiles?: Set<string>): Promise<void>;
export declare function collectSkills(directory: string, area: string, projectRoot: string, skills: DiscoveredSkill[], diagnostics: RouterDiagnostic[], seenFiles?: Set<string>): Promise<void>;
export declare function safeDirectory(candidate: string, projectRoot: string, diagnostics: RouterDiagnostic[], code: string, quietMissing?: boolean): Promise<string | undefined>;
export declare function findCaseInsensitiveEntry(directory: string, wanted: string, diagnostics: RouterDiagnostic[], projectRoot: string): Promise<string | undefined>;
export declare function inside(root: string, target: string): boolean;
export declare function posixRelative(root: string, target: string): string;
export declare function areaOrder(area: string): string;
export declare function diagnostic(code: string, pathValue: string, message: string): RouterDiagnostic;
