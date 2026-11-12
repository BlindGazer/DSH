import { Button } from '@kalex/dsh-core';
import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.js';
import { TestId } from '../../../../shared/constants/testId.js';
import type { UseWorkspaceSnapshot } from '../../../models/WorkspaceManagerClientContext.js';
import { getWorkspaceDisplayTitle } from '../services/workspaceLabels.js';

interface WorkspaceEditorListProps {
    readonly useWorkspaces: UseWorkspaceSnapshot;
    readonly openEdit: (workspaceId: string) => void;
    readonly t: Translate;
}

export function WorkspaceEditorList({ useWorkspaces, openEdit, t }: WorkspaceEditorListProps) {
    // oxlint-disable-next-line react/rules-of-hooks -- Хук приходит из стабильного слота DSH.
    const workspaces = useWorkspaces(snapshot => snapshot.items);
    return (
        <div className="addir-workspace-editors" data-testid={TestId.WorkspaceManager.WorkspaceList}>
            <h3>{t('workspaceEditors')}</h3>
            {workspaces.map(workspace => (
                <div className="addir-setting" key={workspace.workspaceId}>
                    <span>{getWorkspaceDisplayTitle(workspace)}</span>
                    <Button variant="secondary" onClick={() => openEdit(workspace.workspaceId)}>
                        {t('edit')}
                    </Button>
                </div>
            ))}
        </div>
    );
}
