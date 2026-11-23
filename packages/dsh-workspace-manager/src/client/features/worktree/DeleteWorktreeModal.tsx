import { Button, Checkbox, Modal, Notification, Spinner, ThemedSelect, useEffectiveTheme } from '@kalex/dsh-core';
import { useId } from 'react';
import type { Translate } from '../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeRepository } from '../../../shared/models/Worktree.ts';
import type { WorkspaceEditTarget } from '../manage-workspaces/models/WorkspaceEditTarget.ts';
import { useDeleteWorktree } from './hooks/useDeleteWorktree.ts';
import styles from './WorktreeModal.module.scss';
import { WorktreeSummary } from './WorktreeSummary.tsx';

export interface DeleteWorktreeModalProps {
    readonly target: WorkspaceEditTarget;
    readonly repository: WorktreeRepository;
    readonly t: Translate;
    readonly onClose: () => void;
    readonly onDeleted: (warnings: readonly string[]) => Promise<void>;
}

export function DeleteWorktreeModal({ target, repository, t, onClose, onDeleted }: DeleteWorktreeModalProps) {
    const dialog = useDeleteWorktree(target, repository, onDeleted);
    const theme = useEffectiveTheme();
    const id = useId();
    const close = () => {
        if (!dialog.busy) onClose();
    };

    return (
        <div className="dsh-core-root" data-theme={theme}>
            <Modal
                open
                title={t('worktreeDelete')}
                closeLabel={t('close')}
                onClose={close}
                cardClassName={styles.dialog ?? ''}
                footer={
                    <div className={styles.footer}>
                        <Button disabled={dialog.busy} onClick={close}>
                            {t('cancel')}
                        </Button>
                        <Button variant="danger" disabled={!dialog.canSubmit} onClick={() => void dialog.submit()}>
                            {dialog.busy ? <Spinner /> : null}
                            {t('worktreeDelete')}
                        </Button>
                    </div>
                }>
                <div className={styles.form}>
                    <WorktreeSummary title={target.displayTitle} path={target.path} branch={repository?.currentBranch} t={t} />
                    <label htmlFor={`${id}-folder`}>
                        <Checkbox
                            id={`${id}-folder`}
                            checked={dialog.folder}
                            disabled={dialog.busy}
                            onChange={checked => {
                                dialog.setFolder(checked);
                                if (!checked) {
                                    dialog.setBranch(false);
                                    dialog.setMerge(false);
                                }
                            }}
                        />{' '}
                        {t('worktreeDeleteFolder')}
                    </label>
                    <label htmlFor={`${id}-branch`}>
                        <Checkbox
                            id={`${id}-branch`}
                            checked={dialog.branch}
                            disabled={!dialog.folder || dialog.busy || repository.currentBranch === null}
                            onChange={dialog.setBranch}
                        />{' '}
                        {t('worktreeDeleteBranch')}
                    </label>
                    <label htmlFor={`${id}-merge`}>
                        <Checkbox
                            id={`${id}-merge`}
                            checked={dialog.merge}
                            disabled={!dialog.folder || dialog.busy || repository.currentBranch === null || !dialog.branches.length}
                            onChange={dialog.setMerge}
                        />{' '}
                        {t('worktreeMergeFirst')}
                    </label>
                    {dialog.merge ? (
                        <div className={styles.field}>
                            <label htmlFor={id}>{t('worktreeMergeInto')}</label>
                            <ThemedSelect
                                fullWidth
                                id={id}
                                optionClassName={styles.option ?? ''}
                                value={dialog.mergeInto}
                                options={[
                                    { value: '', label: t('worktreeSelectBranch'), disabled: true },
                                    ...dialog.branches.map(value => ({ value, label: value }))
                                ]}
                                disabled={dialog.busy}
                                onChange={dialog.setMergeInto}
                            />
                        </div>
                    ) : null}
                </div>
            </Modal>
            {dialog.error ? (
                <Notification
                    severity="error"
                    title={t('worktreeDelete')}
                    message={t(dialog.error)}
                    copyLabel={t('vscodeCopy')}
                    closeLabel={t('close')}
                    onClose={() => dialog.setError(undefined)}
                />
            ) : null}
        </div>
    );
}
