import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.js';
import type { WorkspaceEditOverlayOptions } from '../hooks/useWorkspaceEditOverlay.js';
import { useWorkspaceEditOverlay } from '../hooks/useWorkspaceEditOverlay.js';
import type { WorkspaceEditActions } from '../models/WorkspaceEditActions.js';
import { WorkspaceAddirModal } from './WorkspaceAddirModal.js';

export interface WorkspaceEditOverlayProps extends WorkspaceEditOverlayOptions, WorkspaceEditActions {
    readonly t: Translate;
}

export function WorkspaceEditOverlay({
    editRequest,
    workspaceSnapshot,
    useWorkspaces,
    t,
    rename,
    removeWorkspace,
    pick
}: WorkspaceEditOverlayProps) {
    const editor = useWorkspaceEditOverlay({ editRequest, workspaceSnapshot, useWorkspaces });
    if (editor.target === undefined) return undefined;
    return (
        <WorkspaceAddirModal
            key={editor.target.workspaceId}
            target={editor.target}
            onClose={editor.close}
            t={t}
            rename={rename}
            removeWorkspace={removeWorkspace}
            pick={pick}
        />
    );
}
