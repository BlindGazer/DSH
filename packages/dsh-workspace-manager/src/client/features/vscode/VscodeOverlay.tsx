import { Button, Modal, Notification, RadioCardGroup, Spinner, useEffectiveTheme } from '@kalex/dsh-core';
import { useId, useSyncExternalStore } from 'react';
import type { Translate } from '../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorkspaceEditTarget } from '../manage-workspaces/models/WorkspaceEditTarget.ts';
import type { SnapshotStore } from '../manage-workspaces/services/snapshotStore.ts';
import { useVscodeWorkflow } from './hooks/useVscodeWorkflow.ts';

interface VscodeOverlayProps {
    readonly request: SnapshotStore<WorkspaceEditTarget | undefined>;
    readonly t: Translate;
}

export function VscodeOverlay({ request, t }: VscodeOverlayProps) {
    const target = useSyncExternalStore(request.subscribe, request.getSnapshot);
    const theme = useEffectiveTheme();
    const groupId = useId();
    const { view, selection, setSelection, isLaunching, submit, close } = useVscodeWorkflow(request, target);
    if (view === undefined) return null;
    return (
        <div className="dsh-core-root" data-theme={theme}>
            {view.kind === 'pending' ? (
                <Modal key="pending" open onClose={close} cardClassName="workspace-manager-vscode-pending-card">
                    <div className="workspace-manager-vscode-progress">
                        <Spinner /> {t('vscodeOpening')}
                    </div>
                </Modal>
            ) : view.kind === 'error' ? (
                <Notification
                    severity="error"
                    title={t('vscodeErrorTitle')}
                    message={`${t(view.key)}\n${view.path}`}
                    onClose={close}
                    copyLabel={t('vscodeCopy')}
                    closeLabel={t('close')}
                />
            ) : (
                <Modal
                    open
                    title={t('vscodeTitle')}
                    closeLabel={t('close')}
                    onClose={close}
                    footer={
                        <>
                            <Button disabled={isLaunching} onClick={close}>
                                {t('cancel')}
                            </Button>
                            <Button variant="primary" disabled={isLaunching || selection === ''} onClick={submit}>
                                {isLaunching ? <Spinner /> : null}
                                {t('vscodeOpen')}
                            </Button>
                        </>
                    }>
                    <RadioCardGroup
                        name={groupId}
                        className="workspace-manager-vscode-files"
                        label={t('vscodeSelectWorkspace')}
                        value={selection}
                        options={view.files.map(file => ({ value: file, label: file.split(/[\\/]/).at(-1) ?? file, description: file }))}
                        onChange={setSelection}
                        disabled={isLaunching}
                    />
                </Modal>
            )}
        </div>
    );
}
