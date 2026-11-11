interface RedirectSettings {
    redirectRootInstructionFiles: boolean;
    rootInstructionFileNames: readonly string[];
    redirectInstructionDirectories: boolean;
    instructionDirectoryNames: readonly string[];
}
interface InstructionChange {
    action?: string;
    path?: string;
}
interface InstructionMessage {
    source?: {
        kind?: string;
        changes?: InstructionChange[];
    };
    content?: {
        type?: string;
        text?: string;
    }[];
}
export declare function matchInstructionRedirect(paths: readonly string[], settings: RedirectSettings): string | undefined;
export declare function filterRootInstructionMessages(messages: readonly InstructionMessage[], rootInstructionFileNames: readonly string[]): readonly InstructionMessage[];
export declare function resolveInstructionDestination(projectRoot: string, relativeTarget: string): Promise<string>;
export {};
