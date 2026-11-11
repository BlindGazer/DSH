import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS } from '../constants/constants.js';
import type { AreaDefinition, GlobalSettings, ProjectSettings } from '../models/RouterModels.js';

type ConfigValue = string | number | boolean | object | undefined;
type ConfigRecord = Record<string, ConfigValue>;

type ValidationResult<T> =
    | { readonly valid: true; readonly settings: T; readonly errors: string[] }
    | { readonly valid: false; readonly settings: Readonly<T>; readonly errors: string[] };

export function validateGlobalSettings(value: ConfigValue = {}): ValidationResult<GlobalSettings> {
    const errors: string[] = [];
    if (!isConfigRecord(value)) return { valid: false, settings: DEFAULT_GLOBAL_SETTINGS, errors: ['global settings must be an object'] };
    const settings = { ...DEFAULT_GLOBAL_SETTINGS, ...value };
    if (typeof settings.locale !== 'string' || !['auto', 'ru', 'en'].includes(settings.locale))
        errors.push('locale must be auto, ru, or en');
    if (typeof settings.theme !== 'string' || !['auto', 'dark', 'light'].includes(settings.theme))
        errors.push('theme must be auto, dark, or light');
    if (typeof settings.pollingIntervalMs !== 'number' || ![2000, 3000, 5000, 10000].includes(settings.pollingIntervalMs))
        errors.push('pollingIntervalMs must be 2000, 3000, 5000, or 10000');
    if (typeof settings.globalLogging !== 'boolean') errors.push('globalLogging must be a boolean');
    const unrecognized = Object.keys(value).filter(key => !Object.hasOwn(DEFAULT_GLOBAL_SETTINGS, key));
    if (unrecognized.length) errors.push(`unrecognized global setting(s): ${unrecognized.join(', ')}`);
    return errors.length ? { valid: false, settings: DEFAULT_GLOBAL_SETTINGS, errors } : { valid: true, settings, errors };
}

const TOP_LEVEL_KEYS = new Set(['areas']);
const AREA_KEYS = new Set(['path', 'keywords', 'enabled']);
const LOG_CATEGORY_KEYS: ReadonlySet<string> = new Set(['events', 'workset', 'rulesDiff', 'preflight']);
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface AreasConfigResult {
    readonly areas: Map<string, AreaDefinition>;
    readonly errors: string[];
    readonly valid: boolean;
}

interface AreaValidation {
    readonly errors: string[];
    readonly area?: AreaDefinition;
}

/** Validate the plugin-owned, per-project settings (not the project's area JSON). */
export function validateProjectSettings(value: ConfigValue = {}): ValidationResult<ProjectSettings> {
    const errors: string[] = [];
    if (!isConfigRecord(value)) return { valid: false, settings: DEFAULT_PROJECT_SETTINGS, errors: ['project settings must be an object'] };
    const allowed = new Set(Object.keys(DEFAULT_PROJECT_SETTINGS));
    const unrecognized = Object.keys(value).filter(key => !allowed.has(key));
    if (unrecognized.length) errors.push(`unrecognized project setting(s): ${unrecognized.join(', ')}`);
    const settings = { ...DEFAULT_PROJECT_SETTINGS, ...value };
    if (settings.discoveryMode !== 'strict' && settings.discoveryMode !== 'fallback' && settings.discoveryMode !== 'merge') {
        errors.push('discoveryMode must be strict, fallback, or merge');
    }
    const root = safeRelative(settings.instructionsRoot, 'instructionsRoot', errors);
    const rulesFolder = singleName(settings.rulesFolder, 'rulesFolder', errors);
    const skillsFolder = singleName(settings.skillsFolder, 'skillsFolder', errors);
    const mainFile = singleName(settings.mainFile, 'mainFile', errors);
    if (rulesFolder && skillsFolder && rulesFolder.toLowerCase() === skillsFolder.toLowerCase()) {
        errors.push('rulesFolder and skillsFolder must differ without case sensitivity');
    }
    if (!Number.isInteger(settings.tokenBudget) || settings.tokenBudget < 1) errors.push('tokenBudget must be a positive integer');
    if (typeof settings.projectLogging !== 'boolean') errors.push('projectLogging must be a boolean');
    if (typeof settings.redirectRootInstructionFiles !== 'boolean') errors.push('redirectRootInstructionFiles must be a boolean');
    if (typeof settings.redirectInstructionDirectories !== 'boolean') errors.push('redirectInstructionDirectories must be a boolean');
    const rootInstructionFileNames = singleNameList(settings.rootInstructionFileNames, 'rootInstructionFileNames', errors);
    const instructionDirectoryNames = singleNameList(settings.instructionDirectoryNames, 'instructionDirectoryNames', errors);
    const categories = settings.logCategories;
    const categoryKeys = ['events', 'workset', 'rulesDiff', 'preflight'] as const;
    if (
        !isRecord(categories) ||
        categoryKeys.some(key => typeof categories[key] !== 'boolean') ||
        Object.keys(categories).some(key => !LOG_CATEGORY_KEYS.has(key))
    ) {
        errors.push('logCategories must contain boolean events, workset, rulesDiff, and preflight fields');
    }
    if (errors.length) return { valid: false, settings: DEFAULT_PROJECT_SETTINGS, errors };
    return {
        valid: true,
        settings: {
            ...settings,
            instructionsRoot: root,
            rulesFolder,
            skillsFolder,
            mainFile,
            rootInstructionFileNames,
            instructionDirectoryNames,
            logCategories: { ...categories }
        },
        errors
    };
}

function singleNameList(
    value: ConfigValue,
    field: 'rootInstructionFileNames' | 'instructionDirectoryNames',
    errors: string[]
): readonly string[] {
    if (
        !Array.isArray(value) ||
        value.some(name => typeof name !== 'string' || name.trim() === '' || name === '.' || name === '..' || /[\\/]/.test(name))
    ) {
        errors.push(`${field} must be an array of single path segments`);
        return DEFAULT_PROJECT_SETTINGS[field];
    }
    return [...new Set(value.map(name => name.trim()))];
}

/** Parse and partially validate agents-router.json. Bad areas do not disable good siblings. */
export function parseAreasConfig(text: string, settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS): AreasConfigResult {
    let value: ConfigRecord | undefined;
    try {
        value = JSON.parse(text);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { areas: new Map(), errors: [`invalid JSON: ${message}`], valid: false };
    }
    if (!isConfigRecord(value)) return { areas: new Map(), errors: ['top-level JSON value must be an object'], valid: false };
    const unrecognizedTop = Object.keys(value).filter(key => !TOP_LEVEL_KEYS.has(key));
    if (unrecognizedTop.length)
        return { areas: new Map(), errors: [`unrecognized top-level field(s): ${unrecognizedTop.join(', ')}`], valid: false };
    if (value.areas === undefined) return { areas: new Map(), errors: [], valid: true };
    if (!isRecord(value.areas)) return { areas: new Map(), errors: ['"areas" must be an object'], valid: false };

    const areas = new Map<string, AreaDefinition>();
    const errors: string[] = [];
    const invalid = new Set<string>();
    for (const [name, raw] of Object.entries(value.areas).toSorted(([a], [b]) => a.localeCompare(b))) {
        const parent = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : undefined;
        const badParent = parent !== undefined && (!areas.has(parent) || invalid.has(parent));
        const result = validateArea(name, raw, settings);
        if (badParent) result.errors.push(`parent area "${parent}" is missing or invalid`);
        if (result.errors.length) {
            invalid.add(name);
            errors.push(...result.errors.map(message => `${name}: ${message}`));
            continue;
        }
        if (!result.area) continue;
        areas.set(name, { ...result.area, ...(parent === undefined ? {} : { parent }) });
    }
    for (const name of invalid) {
        for (const child of areas.keys()) if (child.startsWith(`${name}/`)) areas.delete(child);
    }
    return { areas, errors, valid: true };
}

function validateArea(name: string, raw: ConfigValue, settings: ProjectSettings): AreaValidation {
    const errors = [];
    if (!name.split('/').every(segment => NAME.test(segment))) errors.push('area names must use lowercase letters, digits, and hyphens');
    if (
        name
            .split('/')
            .some(segment =>
                ['dsh', settings.rulesFolder.toLowerCase(), settings.skillsFolder.toLowerCase()].includes(segment.toLowerCase())
            )
    ) {
        errors.push('area name contains a reserved segment');
    }
    if (!isConfigRecord(raw)) return { errors: [...errors, 'area value must be an object'] };
    const unrecognized = Object.keys(raw).filter(key => !AREA_KEYS.has(key));
    if (unrecognized.length) errors.push(`unrecognized field(s): ${unrecognized.join(', ')}`);
    const paths = typeof raw.path === 'string' ? [raw.path] : raw.path;
    if (!Array.isArray(paths) || paths.length === 0 || !paths.every(validProjectFilter))
        errors.push('path must be a non-empty string or array of non-empty project-relative paths');
    if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') errors.push('enabled must be a boolean');
    const keywordValues = raw.keywords;
    if (keywordValues !== undefined && (!Array.isArray(keywordValues) || !keywordValues.every(word => typeof word === 'string')))
        errors.push('keywords must be an array of strings');
    if (errors.length) return { errors };
    const validatedPaths = Array.isArray(paths) ? paths.filter(validProjectFilter) : [];
    const keywords = Array.isArray(keywordValues) ? keywordValues.filter((word): word is string => typeof word === 'string') : [];
    const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : true;
    return { errors, area: { name, path: validatedPaths, keywords, enabled } };
}

export function validProjectFilter(value: ConfigValue): value is string {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed || trimmed === '!') return false;
    const raw = trimmed.startsWith('!') ? trimmed.slice(1).trim() : trimmed;
    if (!raw || raw.startsWith('!')) return false;
    const normalized = raw.replaceAll('\\', '/');
    return !normalized.startsWith('/') && !/^[A-Za-z]:/.test(normalized) && !normalized.split('/').includes('..');
}

function safeRelative(value: ConfigValue, field: 'instructionsRoot', errors: string[]): string {
    if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${field} must be a non-empty project-relative path`);
        return DEFAULT_PROJECT_SETTINGS.instructionsRoot;
    }
    const normalized = value.replaceAll('\\', '/');
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').includes('..')) {
        errors.push(`${field} must stay inside the project`);
        return DEFAULT_PROJECT_SETTINGS.instructionsRoot;
    }
    return normalized.replace(/^\.\//, '');
}

function singleName(value: ConfigValue, field: 'rulesFolder' | 'skillsFolder' | 'mainFile', errors: string[]): string {
    if (typeof value !== 'string' || value === '' || value === '.' || value === '..' || /[\\/]/.test(value)) {
        errors.push(`${field} must be one path segment`);
        return DEFAULT_PROJECT_SETTINGS[field];
    }
    return value;
}

function isConfigRecord(value: ConfigValue): value is ConfigRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isRecord(value: ConfigValue): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
