import type { NormalizedRuleMetadata, SourceVendor } from '../../shared/models/RouterModels.js';
interface InstructionMetadata {
    path: readonly string[];
    description?: string;
    enabled: boolean;
    name?: string;
    whenToUse?: string;
    metadata?: Record<string, string | number | boolean | object | undefined>;
    modelInvocable?: boolean;
    userInvocable?: boolean;
    license?: string;
    compatibility?: string;
    'allowed-tools'?: readonly string[];
    'disable-model-invocation'?: boolean | string | number;
    'user-invocable'?: boolean | string | number;
}
interface RuleInstructionMetadata extends InstructionMetadata, NormalizedRuleMetadata {
}
export interface RuleParseContext {
    readonly sourcePath?: string;
    readonly sourceVendor?: SourceVendor;
    readonly forceAlwaysApply?: boolean;
    readonly defaultAlwaysApply?: boolean;
}
interface SkillInstructionMetadata extends InstructionMetadata {
    description: string;
    modelInvocable: boolean;
    userInvocable: boolean;
}
interface ParsedInstruction<TMetadata extends InstructionMetadata = InstructionMetadata> {
    metadata: TMetadata;
    content: string;
}
export declare class MetadataError extends Error {
    constructor(message: string);
}
/** Parse an optional YAML frontmatter block and validate supported metadata. */
export declare function parseInstruction(text: string, kind: 'rule', context?: RuleParseContext): ParsedInstruction<RuleInstructionMetadata>;
export declare function parseInstruction(text: string, kind: 'skill'): ParsedInstruction<SkillInstructionMetadata>;
/** Read and parse only SKILL.md frontmatter; the body is deferred until invocation. */
export declare function readSkillMetadata(filePath: string): Promise<SkillInstructionMetadata>;
export {};
