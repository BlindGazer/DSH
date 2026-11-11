interface MetricSkill {
    name: string;
    description: string;
    invocation?: {
        userInvocable?: boolean;
    };
}
interface RuntimeSection {
    name: string;
    text?: string;
}
interface MetricMessage {
    source?: {
        kind?: string;
        name?: string;
        form?: string;
        sections?: RuntimeSection[];
    };
    content?: {
        type: string;
        text?: string;
    }[];
}
interface MetricState {
    text: string;
    areaText: string;
    rules: {
        id: string;
    }[];
    snapshot: {
        areas: Map<string, {
            enabled: boolean;
            available: boolean;
        }>;
    };
    settings: {
        tokenBudget: number;
    };
}
export declare function roughTokenEstimate(text: string): number;
export declare function computeRuleMetrics(state: Pick<MetricState, 'text' | 'areaText'>): {
    characters: number;
    estTokens: number;
};
export declare function computeContextMetrics(state: MetricState, availableSkills: readonly MetricSkill[], modelSkills: readonly MetricSkill[], messages: readonly MetricMessage[]): {
    rules: {
        count: number;
        characters: number;
    };
    areaCatalog: {
        count: number;
        characters: number;
    };
    skillCatalog: {
        count: number;
        characters: number;
    };
    ownSkills: {
        count: number;
        userCommands: number;
    };
    loadedSkills: {
        count: number;
        names: string[];
        characters: number;
        scope: string;
    };
    uniqueCurrentSetCharacters: number;
    uniqueRecognizedSkillBodyCharacters: number;
    visibleKnownPluginCharacters: number;
    estimatedTokens: number;
    estimatedOverSoftBudget: boolean;
    unit: string;
    note: string;
    tokenBudget: number;
};
export {};
