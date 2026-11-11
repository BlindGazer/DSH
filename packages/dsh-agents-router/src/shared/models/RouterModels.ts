/**
 * Конфигурация области проекта из agents-router.json.
 */
export interface AreaDefinition {
    readonly name: string;
    readonly path: readonly string[];
    readonly keywords: readonly string[];
    enabled: boolean;
    available?: boolean;
    parent?: string;
    directory?: string;
}

export type RuleActivationMode = 'always' | 'glob' | 'agent-requested' | 'manual';

export type SourceVendor = 'agents' | 'cursor' | 'claude' | 'codex' | 'root-file';

export interface RawRuleFrontmatter {
    readonly glob?: string | string[];
    readonly globs?: string | string[];
    readonly path?: string | string[];
    readonly paths?: string | string[];
    readonly alwaysApply?: boolean;
    readonly description?: string;
}

export interface NormalizedRuleMetadata {
    readonly globs: readonly string[];
    readonly alwaysApply: boolean;
    readonly activationMode: RuleActivationMode;
    readonly sourceVendor?: SourceVendor;
}

/**
 * Описание обнаруженного правила (.md) с метаданными.
 */
export interface DiscoveredRule extends Partial<NormalizedRuleMetadata> {
    readonly id?: string;
    readonly area: string;
    readonly sourcePath: string;
    readonly filePath: string;
    readonly appliesTo?: readonly string[];
    readonly enabled: boolean;
    readonly description?: string;
    readonly content?: string;
    readonly hash?: string;
    readonly path?: readonly string[];
}

/**
 * Описание обнаруженного навыка (SKILL.md).
 */
export interface DiscoveredSkill {
    readonly area: string;
    readonly name: string;
    readonly folderName?: string;
    readonly sourcePath: string;
    readonly filePath: string;
    readonly enabled: boolean;
    readonly description?: string;
    readonly whenToUse?: string;
    readonly invocation?: {
        readonly modelInvocable: boolean;
        readonly userInvocable: boolean;
    };
    readonly metadata?: Record<string, string | number | object | boolean | undefined>;
    readonly content?: string;
    readonly hash?: string;
    readonly license?: string;
    readonly compatibility?: string;
    readonly 'allowed-tools'?: readonly string[];
}

/**
 * Диагностическое сообщение маршрутизатора.
 */
export interface RouterDiagnostic {
    readonly code: string;
    readonly target?: string;
    readonly message: string;
    readonly level?: 'warning' | 'error' | 'info';
    readonly key?: string;
    readonly path?: string;
}

/**
 * Снимок обнаружения проекта.
 */
export interface ProjectDiscoverySnapshot {
    projectRoot?: string | undefined;
    instructionsRoot?: string | undefined;
    readonly rules: DiscoveredRule[];
    readonly skills: DiscoveredSkill[];
    readonly areas: Map<string, AreaDefinition>;
    readonly areasConfigValid: boolean;
    readonly diagnostics: RouterDiagnostic[];
    readonly complete: boolean;
    readonly rulesComplete: boolean;
}

/**
 * Настройки изоляции инструкций и ограничений проекта.
 */
export interface ProjectSettings {
    readonly instructionsRoot: string;
    readonly discoveryMode?: 'strict' | 'fallback' | 'merge';
    readonly rulesFolder: string;
    readonly skillsFolder: string;
    readonly mainFile: string;
    readonly tokenBudget: number;
    readonly projectLogging: boolean;
    readonly redirectRootInstructionFiles: boolean;
    readonly rootInstructionFileNames: readonly string[];
    readonly redirectInstructionDirectories: boolean;
    readonly instructionDirectoryNames: readonly string[];
    readonly logCategories: {
        readonly events: boolean;
        readonly workset: boolean;
        readonly rulesDiff: boolean;
        readonly preflight: boolean;
    };
}

/**
 * Тело запроса к API маршрутизатора.
 */
export interface RouterPostBody {
    readonly [key: string]: string | number | boolean | ProjectSettings;
}

/**
 * Глобальные настройки плагина маршрутизации.
 */
export interface GlobalSettings {
    readonly locale: 'auto' | 'ru' | 'en';
    readonly theme: 'auto' | 'dark' | 'light';
    readonly pollingIntervalMs: 2000 | 3000 | 5000 | 10000;
    readonly globalLogging: boolean;
}

/**
 * Расширенное описание правила с состоянием выбора и причиной.
 */
export interface DiscoveredRuleWithState extends DiscoveredRule {
    readonly appliesTo: readonly string[];
    readonly selected: boolean;
    readonly reason: string;
    readonly source: string;
    readonly characters?: number;
}

/**
 * Описание области для отображения в каталоге.
 */
export interface AreaDisplayInfo {
    readonly name: string;
    readonly path: readonly string[];
    readonly reason: string;
}

/**
 * Элемент покрытия инструмента.
 */
export interface CoverageItem {
    readonly tool: string;
    readonly pathField: string;
    readonly coverage: string;
}

/**
 * Метрики использования токенов.
 */
export interface RouterMetrics {
    readonly estimatedTokens: number;
    readonly tokenBudget: number;
    readonly lastUpdated: number;
    readonly rules?: { readonly count: number; readonly characters: number };
    readonly areaCatalog?: { readonly count: number; readonly characters: number };
    readonly skillCatalog?: { readonly count: number; readonly characters: number };
    readonly loadedSkills?: {
        readonly count: number;
        readonly names: readonly string[];
        readonly characters: number;
        readonly scope: string;
    };
    readonly uniqueCurrentSetCharacters?: number;
    readonly visibleKnownPluginCharacters?: number;
}

/**
 * Расширенное диагностическое сообщение.
 */
export interface RouterDiagnosticExtended extends RouterDiagnostic {
    readonly key: string;
    readonly path: string;
}

/**
 * Ответ API для состояния роутера (RouterStateResponse).
 */
export interface RouterStateResponse {
    readonly sessionId: string;
    readonly rules: DiscoveredRuleWithState[];
    readonly skills: DiscoveredSkill[];
    readonly settings: ProjectSettings;
    readonly globalSettings: GlobalSettings;
    readonly metrics: RouterMetrics;
    readonly diagnostics: RouterDiagnosticExtended[];
    readonly areas: AreaDisplayInfo[];
    readonly coverage: CoverageItem[];
    readonly auditWarning?: string;
    readonly projectRoot?: string;
    readonly resolvedInstructionsRoot?: string;
    readonly status?: string;
    readonly canReset?: boolean;
    readonly activePaths?: readonly string[];
}

/**
 * Данные для диагностики пути.
 */
export interface DiagnosisData {
    readonly note?: string;
    readonly results?: readonly {
        readonly path: string;
        readonly rules: readonly {
            readonly source: string;
            readonly applies: boolean;
            readonly reason: string;
        }[];
    }[];
}
