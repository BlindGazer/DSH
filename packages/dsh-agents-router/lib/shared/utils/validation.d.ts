import type { AreaDefinition, GlobalSettings, ProjectSettings } from '../models/RouterModels.js';
type ConfigValue = string | number | boolean | object | undefined;
type ValidationResult<T> = {
    readonly valid: true;
    readonly settings: T;
    readonly errors: string[];
} | {
    readonly valid: false;
    readonly settings: Readonly<T>;
    readonly errors: string[];
};
export declare function validateGlobalSettings(value?: ConfigValue): ValidationResult<GlobalSettings>;
interface AreasConfigResult {
    readonly areas: Map<string, AreaDefinition>;
    readonly errors: string[];
    readonly valid: boolean;
}
/** Validate the plugin-owned, per-project settings (not the project's area JSON). */
export declare function validateProjectSettings(value?: ConfigValue): ValidationResult<ProjectSettings>;
/** Parse and partially validate agents-router.json. Bad areas do not disable good siblings. */
export declare function parseAreasConfig(text: string, settings?: ProjectSettings): AreasConfigResult;
export declare function validProjectFilter(value: ConfigValue): value is string;
export declare function isRecord(value: ConfigValue): boolean;
export {};
