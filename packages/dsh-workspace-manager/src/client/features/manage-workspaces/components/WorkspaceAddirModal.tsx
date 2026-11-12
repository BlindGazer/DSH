import { Button, Modal, Spinner, useEffectiveTheme } from '@kalex/dsh-core';
import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.js';
import { TestId } from '../../../../shared/constants/testId.js';
import { useWorkspaceEditor } from '../hooks/useWorkspaceEditor.js';
import type { WorkspaceEditActions } from '../models/WorkspaceEditActions.js';
import type { WorkspaceEditTarget } from '../models/WorkspaceEditTarget.js';
import { getPathBasename } from '../services/workspaceLabels.js';
import { DirectoryRow } from './DirectoryRow.js';

export interface WorkspaceEditorProps extends WorkspaceEditActions {
    readonly target: WorkspaceEditTarget;
    readonly onClose: () => void;
    readonly t: Translate;
}

export function WorkspaceAddirModal({ target, onClose, rename, removeWorkspace, pick, t }: WorkspaceEditorProps) {
    const editor = useWorkspaceEditor(target, { rename, removeWorkspace, pick }, onClose, t);
    const theme = useEffectiveTheme();
    return (
        <Modal open title={t('title')} closeLabel={t('close')} onClose={editor.close} theme={theme} cardClassName="addir-modal">
            <div className="addir-editor" data-testid={TestId.WorkspaceManager.Editor}>
                <input
                    className="addir-name"
                    value={editor.title}
                    disabled={editor.busy || editor.picking}
                    // biome-ignore lint/a11y/noAutofocus: Общая модалка не переводит фокус внутрь диалога.
                    autoFocus
                    aria-label={t('name')}
                    onChange={event => editor.setTitle(event.target.value)}
                />
                {editor.confirmRemove ? (
                    <div className="addir-confirm">
                        <p>{t('unlinkNote')}</p>
                        <div className="addir-confirm-actions">
                            <Button disabled={editor.busy || editor.picking} onClick={() => editor.setConfirmRemove(false)}>
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="danger"
                                disabled={editor.busy || editor.picking}
                                onClick={() => {
                                    void editor.remove();
                                }}>
                                {t('confirmUnlink')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="addir-source">
                        <h3 className="addir-heading">{t('folders')}</h3>
                        {editor.loading ? (
                            <Spinner label={t('loading')} />
                        ) : !editor.loaded ? (
                            <Button onClick={() => editor.setReload(value => value + 1)}>{t('retry')}</Button>
                        ) : (
                            <div className="addir-folder-list" data-testid={TestId.WorkspaceManager.DirectoryList}>
                                <div className="addir-folder">
                                    <div className="addir-folder-info">
                                        <span className="addir-folder-name">{getPathBasename(target.path)}</span>
                                        <span className="addir-folder-path" title={target.path}>
                                            {target.path}
                                        </span>
                                    </div>
                                    <span className="addir-primary">{t('primary')}</span>
                                </div>
                                {editor.directories.map((directory, index) => (
                                    <DirectoryRow
                                        key={directory.path}
                                        directory={directory}
                                        index={index}
                                        busy={editor.busy || editor.picking}
                                        setDirectories={editor.setDirectories}
                                        t={t}
                                    />
                                ))}
                                <Button
                                    disabled={editor.busy || editor.picking}
                                    onClick={() => {
                                        void editor.add();
                                    }}>
                                    {editor.picking ? <Spinner label={t('loading')} markLoadingRoot={false} /> : undefined}
                                    {t('add')}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                {editor.error !== undefined ? (
                    <div className="addir-error" role="alert">
                        {editor.error}
                    </div>
                ) : undefined}
                <div className="addir-modal-actions">
                    <Button
                        variant="danger"
                        disabled={editor.busy || editor.picking || editor.loading}
                        onClick={() => editor.setConfirmRemove(true)}>
                        {t('unlink')}
                    </Button>
                    <span className="addir-footer-spacer" />
                    <Button disabled={editor.busy || editor.picking} onClick={editor.close}>
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        disabled={editor.busy || editor.picking || !editor.loaded || editor.confirmRemove || !editor.title.trim()}
                        onClick={() => {
                            void editor.save();
                        }}>
                        {editor.busy ? <Spinner label={t('loading')} markLoadingRoot={false} /> : undefined}
                        {t('save')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
