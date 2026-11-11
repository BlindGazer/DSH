import type { currentDirectory } from './sessionController.js';
interface PreflightExec {
    agent?: PreflightAgent;
    parent?: string;
    callId: string;
    name: string;
    arguments?: Record<string, string | undefined>;
}
type PreflightAgent = Parameters<typeof currentDirectory>[2];
interface FileOperation {
    paths?: string[];
    error?: string;
}
interface FileCall {
    callId: string;
    name: string;
    paths?: string[];
}
interface FileBatch {
    calls: FileCall[];
    error?: string;
}
export declare function isFileTool(name: string): boolean;
export declare function isSearchTool(name: string): boolean;
/** Validate one known file call before any sibling in the same assistant batch runs. */
export declare function extractFileOperation(name: string, args: Record<string, string | undefined> | undefined): FileOperation;
/** Read all file calls in a model-authored message, or one PTC child call. */
export declare function fileBatch(agent: PreflightAgent | undefined, exec: PreflightExec): FileBatch;
/** Resolve aliases against the current Session directory and return project-relative forms. */
export declare function projectPaths(projectRoot: string, workingDirectory: string, rawPath: string): Promise<string[]>;
export {};
