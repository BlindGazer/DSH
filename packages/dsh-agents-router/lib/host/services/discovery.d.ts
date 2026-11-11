import { type ProjectSettings } from '../../shared/index.js';
import type { AreaDefinition, DiscoveredRule, DiscoveredSkill, RouterDiagnostic } from '../../shared/models/RouterModels.js';
interface ProjectDiscoverySnapshot {
    projectRoot?: string;
    instructionsRoot?: string;
    rules: DiscoveredRule[];
    skills: DiscoveredSkill[];
    areas: Map<string, AreaDefinition>;
    areasConfigValid: boolean;
    diagnostics: RouterDiagnostic[];
    complete: boolean;
    rulesComplete: boolean;
}
interface SkillLocator {
    name?: string;
    sourcePath?: string;
}
/** Discover configured project instructions without creating or modifying project files. */
export declare function discoverProject(projectPath: string, settings?: ProjectSettings): Promise<ProjectDiscoverySnapshot>;
/** Load a skill's full body only after the native DSH loader asks for it. */
export declare function loadSkillDefinition(projectRoot: string, settings: ProjectSettings, locator?: SkillLocator): Promise<DiscoveredSkill | undefined>;
export { diagnosePath, renderRules, selectRules } from './ruleSelector.js';
