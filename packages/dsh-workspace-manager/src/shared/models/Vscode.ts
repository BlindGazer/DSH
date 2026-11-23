export interface VscodeDiscovery {
    readonly workspaceFiles: readonly string[];
}

export type VscodeErrorCode = 'accessDenied' | 'workspaceFileMissing' | 'vscodeUnavailable' | 'vscodeFailed' | 'vscodeDisabled';
