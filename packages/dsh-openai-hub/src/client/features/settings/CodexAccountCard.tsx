import { Button, Checkbox, IconButton, LinearProgress, Modal, RefreshIcon, TextField, Tooltip } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import { TestId } from '../../../shared/constants/testId.ts';
import type { AccountSnapshot } from '../../../shared/remote.ts';
import styles from './codexStyles.module.scss';
import { formatQuotaReset } from './formatQuotaReset.ts';
import { useCodexAccountCard } from './hooks/useCodexAccountCard.ts';
import type { OpenAICodexController } from './openAICodexRuntime.ts';
export interface CodexAccountCardProps {
    readonly account: AccountSnapshot;
    readonly controller: OpenAICodexController;
    readonly text: (key: OpenAICodexText) => string;
}
export function CodexAccountCard({ account, controller, text }: CodexAccountCardProps) {
    const panel = useCodexAccountCard(account, controller, text);
    const weeklyLimit = account.usageLimits.find(limit => limit.windowSeconds === 604_800);
    return (
        <section className={`${styles.panel} ${styles.modalLayout}`} data-testid={`${TestId.OpenAIHub.Account}-${account.accountLabel}`}>
            <div className={styles.modalBody}>
                {panel.editingLabel ? (
                    <div className={styles.renameEditor}>
                        <label htmlFor={panel.labelId}>{text('accountLabel')}</label>
                        <TextField id={panel.labelId} value={panel.label} onChange={panel.setLabel} maxLength={32} />
                    </div>
                ) : undefined}
                <section className={styles.card} data-testid={`${TestId.OpenAIHub.Usage}-${account.accountLabel}`}>
                    <h3 id={`${panel.labelId}-usage`}>{text('usage')}</h3>
                    <div className={styles.quotaList}>
                        {account.usageLimits.map(limit => {
                            const remainingPercent = Math.max(0, Math.min(100, Math.round(100 - limit.usedPercent)));
                            const label = limit === weeklyLimit ? text('weeklyLimit') : limit.name;
                            return (
                                <div className={styles.quotaItem} key={`${limit.name}-${limit.windowSeconds}`}>
                                    <div className={styles.quotaLabel}>
                                        <span>{label}</span>
                                        <span className={styles.linearUsageValue}>{remainingPercent}%</span>
                                    </div>
                                    <Tooltip
                                        className={styles.quotaBar ?? ''}
                                        content={`${label}: ${remainingPercent}%`}
                                        triggerElement="span">
                                        <LinearProgress value={remainingPercent} size="standard" color="accent" />
                                    </Tooltip>
                                    {limit.resetAt > 0 ? (
                                        <p className={styles.quotaReset}>
                                            <Tooltip content={new Date(limit.resetAt).toLocaleString()}>
                                                {formatQuotaReset(limit.resetAt, text)}
                                            </Tooltip>
                                        </p>
                                    ) : undefined}
                                </div>
                            );
                        })}
                        {!weeklyLimit ? (
                            <div className={styles.quotaItem}>
                                <div className={styles.quotaLabel}>
                                    <span>{text('weeklyLimit')}</span>
                                    <Tooltip className={styles.quotaUnavailable ?? ''} content={text('weeklyLimitUnavailable')} side="top">
                                        {text('quotaNoData')}
                                    </Tooltip>
                                </div>
                                <span className={styles.quotaEmptyTrack} />
                            </div>
                        ) : undefined}
                    </div>
                    {account.usageLimited ? <p>{text('usageLimited')}</p> : undefined}
                    {account.usageCredits ? (
                        <p>
                            {text('credits')}: {account.usageCreditsUnlimited ? text('unlimited') : account.usageCredits}
                        </p>
                    ) : undefined}
                    <div className={styles.usageActions}>
                        <Button disabled={panel.busy} onClick={() => void panel.refreshUsage()}>
                            {text('refreshUsage')}
                        </Button>
                    </div>
                </section>
                <section className={styles.card}>
                    <h3 id={`${panel.labelId}-reset-cards`}>{text('resetCards')}</h3>
                    <p>
                        {text('resetAvailable')}: {account.usageResetCredits ?? text('usageUnavailable')}
                    </p>
                    {account.resetCardsStatus === 'error' ? <p>{text('resetDetailsUnavailable')}</p> : undefined}
                    {account.resetCards.map(card => (
                        <div className={styles.usageRow} key={card.id}>
                            <span>
                                {text('resetCardLabel')} ·{' '}
                                {card.expiresAt ? new Date(card.expiresAt).toLocaleString() : text('expiresUnknown')}
                            </span>
                            <Button
                                disabled={panel.busy || Boolean(panel.pendingReset && panel.pendingReset.creditId !== card.id)}
                                onClick={() => panel.setResetCard(card.id)}>
                                {panel.pendingReset?.creditId === card.id ? text('resetRetry') : text('resetUse')}
                            </Button>
                        </div>
                    ))}
                    {panel.pendingReset && !account.resetCards.some(card => card.id === panel.pendingReset?.creditId) ? (
                        <div className={styles.usageRow}>
                            <span>{text('resetCardLabel')}</span>
                            <Button disabled={panel.busy} onClick={() => panel.setResetCard(panel.pendingReset?.creditId ?? '')}>
                                {text('resetRetry')}
                            </Button>
                        </div>
                    ) : undefined}
                    {panel.resetResult ? <p>{panel.resetResult}</p> : undefined}
                </section>
            </div>
            <footer className={styles.modalFooter} data-testid={TestId.OpenAIHub.ModalFooter}>
                {panel.error ? <p>{panel.error}</p> : undefined}
                <div className={styles.modalActionGroups}>
                    {!panel.editingLabel ? (
                        <div className={styles.actionsLeft}>
                            <Button variant="danger" disabled={panel.busy} onClick={() => panel.setDeleteModalOpen(true)}>
                                {text('deleteAccount')}
                            </Button>
                            <Button
                                disabled={panel.busy}
                                onClick={() => {
                                    panel.setLabel(account.accountLabel);
                                    panel.setEditingLabel(true);
                                }}>
                                {text('rename')}
                            </Button>
                        </div>
                    ) : undefined}
                    <div className={styles.actionsRight}>
                        {panel.editingLabel ? (
                            <>
                                <Button
                                    disabled={panel.busy}
                                    onClick={() => {
                                        panel.setEditingLabel(false);
                                        panel.setLabel(account.accountLabel);
                                    }}>
                                    {text('cancel')}
                                </Button>
                                <Button variant="primary" disabled={panel.busy} onClick={() => void panel.saveLabel()}>
                                    {text('save')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Tooltip content={text('refreshCatalog')} triggerElement="span" side="top">
                                    <IconButton variant="neutral" disabled={panel.busy} onClick={() => void panel.refreshCatalog()}>
                                        <RefreshIcon />
                                    </IconButton>
                                </Tooltip>
                                <Button variant="primary" disabled={panel.busy} onClick={() => void panel.openModels()}>
                                    {text('editModels')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </footer>
            <Modal
                open={panel.modelModalOpen}
                onClose={() => panel.setModelModalOpen(false)}
                title={`${text('models')} - ${account.accountLabel}`}
                closeLabel={text('close')}
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div data-testid={`${TestId.OpenAIHub.ModalScrollBody}-${account.accountLabel}`} className={styles.modalBody}>
                    <section className={styles.modelList}>
                        <div className={styles.modelHeader}>
                            <span className={`${styles.modelCell} ${styles.modelGripColumn}`} />
                            <span className={`${styles.modelCell} ${styles.modelIdColumn}`}>{text('modelId')}</span>
                            <span className={`${styles.modelCell} ${styles.modelNameColumn}`}>{text('modelName')}</span>
                            <span className={`${styles.modelCell} ${styles.modelEnabledColumn}`}>{text('enabled')}</span>
                        </div>
                        <ul className={styles.modelRows}>
                            {panel.draft.map((model, index) => (
                                <li
                                    className={styles.modelRow}
                                    key={model.id}
                                    onDragOver={event => event.preventDefault()}
                                    onDrop={event => {
                                        event.preventDefault();
                                        const sourceId = event.dataTransfer.getData('text/plain');
                                        panel.moveModel(
                                            panel.draft.findIndex(candidate => candidate.id === sourceId),
                                            index
                                        );
                                    }}>
                                    <div className={`${styles.modelCell} ${styles.modelGripColumn}`}>
                                        <button
                                            type="button"
                                            className={styles.modelGrip}
                                            draggable
                                            onDragStart={event => {
                                                event.dataTransfer.effectAllowed = 'move';
                                                event.dataTransfer.setData('text/plain', model.id);
                                            }}
                                            onKeyDown={event => {
                                                if (event.key === 'ArrowUp' && index > 0) {
                                                    event.preventDefault();
                                                    panel.moveModel(index, index - 1);
                                                } else if (event.key === 'ArrowDown' && index < panel.draft.length - 1) {
                                                    event.preventDefault();
                                                    panel.moveModel(index, index + 1);
                                                }
                                            }}>
                                            <span />
                                        </button>
                                    </div>
                                    <div className={`${styles.modelCell} ${styles.modelIdColumn} ${styles.modelId}`}>{model.id}</div>
                                    <div className={`${styles.modelCell} ${styles.modelNameColumn}`}>
                                        <TextField value={model.name} onChange={value => panel.updateModel(index, { name: value })} />
                                    </div>
                                    <div className={`${styles.modelCell} ${styles.modelEnabledColumn}`}>
                                        <label className={styles.checkLabel} htmlFor={`model-enabled-${model.id}`}>
                                            <Checkbox
                                                checked={model.enabled}
                                                onChange={checked => panel.updateModel(index, { enabled: checked })}
                                            />
                                            {text('enabled')}
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
                <div className={styles.modalFooter} data-core-modal-footer>
                    {panel.error ? <p>{panel.error}</p> : undefined}
                    <div className={styles.actionsRight}>
                        <Button onClick={() => panel.setModelModalOpen(false)}>{text('cancel')}</Button>
                        <Button
                            variant="primary"
                            disabled={panel.busy || !panel.draft.some(model => model.enabled)}
                            onClick={() => void panel.saveModels()}>
                            {text('save')}
                        </Button>
                    </div>
                </div>
            </Modal>
            <Modal
                open={Boolean(panel.resetCard)}
                onClose={() => panel.setResetCard('')}
                title={text('resetConfirmTitle')}
                closeLabel={text('close')}
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.modalBody}>
                    <p>{text('resetConfirm')}</p>
                    {panel.error ? <p>{panel.error}</p> : undefined}
                </div>
                <div className={styles.modalFooter} data-core-modal-footer>
                    <div className={styles.actionsRight}>
                        <Button disabled={panel.busy} onClick={() => panel.setResetCard('')}>
                            {text('cancel')}
                        </Button>
                        <Button variant="danger" disabled={panel.busy} onClick={() => void panel.confirmReset()}>
                            {text('confirm')}
                        </Button>
                    </div>
                </div>
            </Modal>
            <Modal
                open={panel.deleteModalOpen}
                onClose={() => panel.setDeleteModalOpen(false)}
                title={text('deleteAccount')}
                closeLabel={text('close')}
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.modalBody}>
                    <p>{text('deleteAccountConfirm')}</p>
                    {panel.error ? <p>{panel.error}</p> : undefined}
                </div>
                <div className={styles.modalFooter} data-core-modal-footer>
                    <div className={styles.actionsRight}>
                        <Button disabled={panel.busy} onClick={() => panel.setDeleteModalOpen(false)}>
                            {text('cancel')}
                        </Button>
                        <Button variant="danger" disabled={panel.busy} onClick={() => void panel.deleteAccount()}>
                            {text('deleteAccount')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
