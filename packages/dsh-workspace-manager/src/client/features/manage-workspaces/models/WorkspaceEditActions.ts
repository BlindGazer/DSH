export interface WorkspaceEditActions {
    readonly rename: (workspaceId: string, title: string) => Promise<void>;
    readonly removeWorkspace: (workspaceId: string) => Promise<void>;
    readonly pick: () => Promise<string | undefined>;
}
