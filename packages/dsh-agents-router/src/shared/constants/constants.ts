import type { GlobalSettings, ProjectSettings } from '../models/RouterModels.js';

export const PLUGIN_ID = 'dsh-agents-router';
export const PACKAGE_ID = '@kalex/dsh-agents-router';
export const PREFIX = '/agents-router';
export const CLIENT_PLUGIN_ID = `${PLUGIN_ID}-client`;
export const AREA_CONTEXT = `${PLUGIN_ID}:areas`;
export const RULE_CONTEXT = `${PLUGIN_ID}:rules`;
export const USAGE_SECTION = `${PLUGIN_ID}:usage`;
export const AREA_CONTEXT_ORDER = 140;
export const RULE_CONTEXT_ORDER = 150;
export const USAGE_SECTION_ORDER = 850;
export const FILE_ERROR = 'AGENTS_ROUTER_REPLAN_REQUIRED';

export const DEFAULT_PROJECT_SETTINGS: Readonly<ProjectSettings> = Object.freeze({
    instructionsRoot: 'agents',
    discoveryMode: 'merge',
    rulesFolder: 'rules',
    skillsFolder: 'skills',
    mainFile: 'agents.md',
    tokenBudget: 16_000,
    projectLogging: false,
    redirectRootInstructionFiles: false,
    rootInstructionFileNames: Object.freeze(['AGENTS.md']),
    redirectInstructionDirectories: false,
    instructionDirectoryNames: Object.freeze(['.cursor', '.claude']),
    logCategories: Object.freeze({ events: true, workset: true, rulesDiff: true, preflight: true })
});

export const DEFAULT_GLOBAL_SETTINGS: Readonly<GlobalSettings> = Object.freeze({
    locale: 'auto',
    theme: 'auto',
    pollingIntervalMs: 3000,
    globalLogging: false
});
