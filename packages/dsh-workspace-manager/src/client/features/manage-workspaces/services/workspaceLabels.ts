import type { WorkspaceView } from '../../../models/WorkspaceManagerClientContext.js';

export function getPathBasename(path: string): string {
    return path.split(/[\\/]/).findLast(Boolean) || path;
}

export function getWorkspaceDisplayTitle(workspace: Pick<WorkspaceView, 'path' | 'title'>): string {
    return workspace.title || getPathBasename(workspace.path);
}
