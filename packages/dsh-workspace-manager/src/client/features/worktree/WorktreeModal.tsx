import { Button, Modal, RadioCardGroup, Spinner, TextField, ThemedSelect, useEffectiveTheme } from '@kalex/dsh-core';
import { useId } from 'react';
import type { Translate } from '../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeRepository, WorktreeSelection } from '../../../shared/models/Worktree.ts';
import type { WorkspaceEditTarget } from '../manage-workspaces/models/WorkspaceEditTarget.ts';
import { useWorktreeDialog } from './hooks/useWorktreeDialog.ts';
import styles from './WorktreeModal.module.scss';

export interface WorktreeModalProps {
    readonly target: WorkspaceEditTarget;
    readonly t: Translate;
    readonly onClose: () => void;
    readonly inspect: (signal: AbortSignal) => Promise<WorktreeRepository>;
    readonly prepare: (selection: WorktreeSelection) => Promise<string>;
    readonly openSession: (path: string) => Promise<void>;
    readonly pick: () => Promise<string | undefined>;
}

export function WorktreeModal({ target, t, ...actions }: WorktreeModalProps) {
    const dialog = useWorktreeDialog(actions);
    const theme = useEffectiveTheme();
    const id = useId();
    const selectId = `${id}-selection`;
    const branchNameId = `${id}-name`;
    const basePathId = `${id}-base`;
    const folderNameId = `${id}-folder`;
    const locked = dialog.action !== undefined || dialog.loading;
    const prepared = dialog.preparedPath !== undefined;
    const available = dialog.mode === 'new' ? dialog.branches : dialog.freeBranches;
    const branchOptions = available.map(branch => ({ value: branch, label: branch }));
    const checkoutOptions = dialog.checkouts.map(item => ({
        value: item.path,
        label: `${item.branch ?? t('worktreeDetached')} (${item.path})`
    }));
    const primaryLabel = t(prepared ? 'worktreeRetryOpen' : dialog.mode === 'open' ? 'worktreeOpenAction' : 'worktreeCreate');
    return (
        <div className="dsh-core-root" data-theme={theme}>
            <Modal
                open
                title={t('worktreeTitle')}
                closeLabel={t('close')}
                onClose={dialog.close}
                cardClassName={styles.dialog ?? ''}
                footer={
                    <div className={styles.footer}>
                        <Button disabled={dialog.action !== undefined} onClick={dialog.close}>
                            {t('cancel')}
                        </Button>
                        {dialog.loadError ? (
                            <Button variant="primary" onClick={dialog.reload}>
                                {t('retry')}
                            </Button>
                        ) : (
                            <Button variant="primary" disabled={!dialog.canSubmit} onClick={() => void dialog.submit()}>
                                {dialog.action === 'submit' ? <Spinner /> : null}
                                {primaryLabel}
                            </Button>
                        )}
                    </div>
                }>
                <div className={styles.form}>
                    <div className={styles.summary}>
                        <div className={styles.location}>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                                aria-hidden="true">
                                <path d="M1.75 12.5v-9h4.5l1.5 1.75h6.5v7.25z" />
                            </svg>
                            <strong>{target.displayTitle}</strong>
                            <p>{target.path}</p>
                        </div>
                        {!dialog.loading && dialog.repository ? (
                            <span className={styles.branch} title={t('worktreeCurrentBranch')}>
                                <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                    strokeLinecap="round"
                                    aria-hidden="true">
                                    <circle cx="4.5" cy="3" r="1.65" />
                                    <circle cx="4.5" cy="13" r="1.65" />
                                    <circle cx="11.5" cy="3" r="1.65" />
                                    <path d="M4.5 4.7v6.6m7-6.6c0 4.2-7 1.7-7 6.6" />
                                </svg>
                                <span>{dialog.repository.currentBranch ?? t('worktreeDetached')}</span>
                            </span>
                        ) : null}
                    </div>
                    {dialog.loading ? (
                        <p>
                            <Spinner /> {t('loading')}
                        </p>
                    ) : null}
                    {prepared ? (
                        <dl>
                            <div>
                                <dt>{t('worktreePreparedPath')}</dt>
                                <dd>{dialog.preparedPath}</dd>
                            </div>
                        </dl>
                    ) : dialog.repository ? (
                        <>
                            <RadioCardGroup
                                name={id}
                                label={t('worktreeMode')}
                                value={dialog.mode}
                                onChange={dialog.setMode}
                                disabled={locked}
                                options={[
                                    { value: 'new', label: t('worktreeNew'), description: t('worktreeNewDescription') },
                                    { value: 'existing', label: t('worktreeExisting'), description: t('worktreeExistingDescription') },
                                    { value: 'open', label: t('worktreeOpen'), description: t('worktreeOpenDescription') }
                                ]}
                            />
                            {dialog.mode === 'open' ? (
                                <div className={styles.field}>
                                    {checkoutOptions.length ? (
                                        <>
                                            <label htmlFor={selectId}>{t('worktreeCheckout')}</label>
                                            <ThemedSelect
                                                fullWidth
                                                id={selectId}
                                                optionClassName={styles.option ?? ''}
                                                value={dialog.checkout}
                                                options={[
                                                    { value: '', label: t('worktreeSelectCheckout'), disabled: true },
                                                    ...checkoutOptions
                                                ]}
                                                onChange={dialog.setCheckout}
                                                disabled={locked}
                                            />
                                            {dialog.checkout ? <p>{dialog.checkout}</p> : null}
                                        </>
                                    ) : (
                                        <p>{t('worktreeNoCheckouts')}</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className={styles.field}>
                                        {branchOptions.length ? (
                                            <>
                                                <label htmlFor={selectId}>
                                                    {t(dialog.mode === 'new' ? 'worktreeSourceBranch' : 'worktreeFreeBranch')}
                                                </label>
                                                <ThemedSelect
                                                    key={dialog.mode}
                                                    fullWidth
                                                    id={selectId}
                                                    optionClassName={styles.option ?? ''}
                                                    value={dialog.mode === 'new' ? dialog.sourceBranch : dialog.branch}
                                                    options={[
                                                        { value: '', label: t('worktreeSelectBranch'), disabled: true },
                                                        ...branchOptions
                                                    ]}
                                                    onChange={dialog.mode === 'new' ? dialog.setSourceBranch : dialog.setBranch}
                                                    disabled={locked}
                                                />
                                            </>
                                        ) : (
                                            <p>{t(dialog.mode === 'new' ? 'worktreeNoBranches' : 'worktreeNoFreeBranches')}</p>
                                        )}
                                    </div>
                                    {dialog.mode === 'new' ? (
                                        <div className={styles.field}>
                                            <label htmlFor={branchNameId}>{t('worktreeBranchName')}</label>
                                            <TextField
                                                id={branchNameId}
                                                className={styles.input ?? ''}
                                                value={dialog.branchName}
                                                onChange={dialog.setBranchName}
                                                disabled={locked}
                                            />
                                        </div>
                                    ) : null}
                                    <div className={styles.field}>
                                        <label htmlFor={basePathId}>{t('worktreeBasePath')}</label>
                                        <div className={styles.picker}>
                                            <TextField
                                                id={basePathId}
                                                className={styles.input ?? ''}
                                                value={dialog.basePath}
                                                onChange={dialog.setBasePath}
                                                disabled={locked}
                                            />
                                            <Button disabled={locked} onClick={() => void dialog.pickBasePath()}>
                                                {dialog.action === 'pick' ? <Spinner /> : null}
                                                {t('browse')}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor={folderNameId}>{t('worktreeFolderName')}</label>
                                        <TextField
                                            id={folderNameId}
                                            className={styles.input ?? ''}
                                            value={dialog.folderName}
                                            onChange={dialog.setFolderName}
                                            disabled={locked}
                                            error={dialog.invalidFolder ? t('worktreeInvalidFolder') : undefined}
                                        />
                                    </div>
                                    <dl>
                                        <div>
                                            <dt>{t('worktreeResultPath')}</dt>
                                            <dd>{dialog.resultPath}</dd>
                                        </div>
                                    </dl>
                                </>
                            )}
                        </>
                    ) : null}
                    {dialog.actionError ? <p className={styles.error}>{t(dialog.actionError)}</p> : null}
                    {dialog.loadError ? <p className={styles.error}>{t(dialog.loadError)}</p> : null}
                </div>
            </Modal>
        </div>
    );
}
