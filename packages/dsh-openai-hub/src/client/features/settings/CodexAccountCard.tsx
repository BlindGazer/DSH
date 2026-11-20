import { Button, LinearProgress, Modal, useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import type { AccountSnapshot } from '../../../shared/remote.js';
import styles from './codexStyles.module.scss';
import { formatQuotaReset } from './formatQuotaReset.js';
import { useCodexAccountCard } from './hooks/useCodexAccountCard.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';
export interface CodexAccountCardProps {
    readonly account: AccountSnapshot;
    readonly controller: OpenAICodexController;
    readonly text: (key: OpenAICodexText) => string;
}
export function CodexAccountCard({ account, controller, text }: CodexAccountCardProps) {
    const theme = useEffectiveTheme();
    const panel = useCodexAccountCard(account, controller, text);
    const chartLimits =
        account.usageStatus !== 'error' && account.usageLimits.length
            ? account.usageLimits
            : [
                  { name: text('fiveHourLimit'), usedPercent: 100, windowSeconds: 18_000, resetAt: 0 },
                  { name: text('weeklyLimit'), usedPercent: 100, windowSeconds: 604_800, resetAt: 0 }
              ];
    return (
        <section
            className={`dsh-core-root ${styles.panel} ${styles.modalLayout}`}
            data-testid={`${TestId.OpenAIHub.Account}-${account.accountLabel}`}
            data-theme={theme}>
            <div className={styles.modalBody}>
                {panel.editingLabel ? (
                    <div className={styles.renameEditor}>
                        <label htmlFor={panel.labelId}>{text('accountLabel')}</label>
                        <input
                            id={panel.labelId}
                            value={panel.label}
                            onChange={event => panel.setLabel(event.currentTarget.value)}
                            maxLength={32}
                        />
                    </div>
                ) : undefined}
                <section
                    className={styles.card}
                    aria-labelledby={`${panel.labelId}-usage`}
                    data-testid={`${TestId.OpenAIHub.Usage}-${account.accountLabel}`}>
                    <h3 id={`${panel.labelId}-usage`}>{text('usage')}</h3>
                    <div className={styles.quotaList}>
                        {chartLimits.map(limit => {
                            const remainingPercent = Math.max(0, Math.min(100, Math.round(100 - limit.usedPercent)));
                            return (
                                <div className={styles.quotaItem} key={`${limit.name}-${limit.windowSeconds}`}>
                                    <div className={styles.quotaLabel}>
                                        <span>{limit.name}</span>
                                        <span className={styles.linearUsageValue}>{remainingPercent}%</span>
                                    </div>
                                    <LinearProgress
                                        className={styles.quotaBar ?? ''}
                                        value={remainingPercent}
                                        label={`${limit.name}: ${remainingPercent}%`}
                                        title={`${limit.name}: ${remainingPercent}%`}
                                        size="standard"
                                        color="accent"
                                    />
                                    {limit.resetAt > 0 ? (
                                        <p className={styles.quotaReset} title={new Date(limit.resetAt).toLocaleString()}>
                                            {formatQuotaReset(limit.resetAt, text)}
                                        </p>
                                    ) : undefined}
                                </div>
                            );
                        })}
                    </div>
                    {account.usageLimited ? <p role="status">{text('usageLimited')}</p> : undefined}
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
                <section className={styles.card} aria-labelledby={`${panel.labelId}-reset-cards`}>
                    <h3 id={`${panel.labelId}-reset-cards`}>{text('resetCards')}</h3>
                    <p>
                        {text('resetAvailable')}: {account.usageResetCredits ?? text('usageUnavailable')}
                    </p>
                    {account.resetCardsStatus === 'error' ? <p role="status">{text('resetDetailsUnavailable')}</p> : undefined}
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
                    {panel.resetResult ? <p role="status">{panel.resetResult}</p> : undefined}
                </section>
            </div>
            <footer className={styles.modalFooter} data-testid={TestId.OpenAIHub.ModalFooter}>
                {panel.error ? <p role="alert">{panel.error}</p> : undefined}
                <div className={styles.modalActionGroups}>
                    <div className={styles.actionsLeft}>
                        {!panel.editingLabel ? (
                            <>
                                <Button variant="primary" disabled={panel.busy} onClick={() => void panel.openModels()}>
                                    {text('editModels')}
                                </Button>
                                <Button disabled={panel.busy} onClick={() => void panel.refreshCatalog()}>
                                    {text('refreshCatalog')}
                                </Button>
                            </>
                        ) : undefined}
                    </div>
                    <div className={styles.actionsRight}>
                        {panel.editingLabel ? (
                            <>
                                <Button variant="primary" disabled={panel.busy} onClick={() => void panel.saveLabel()}>
                                    {text('save')}
                                </Button>
                                <Button
                                    disabled={panel.busy}
                                    onClick={() => {
                                        panel.setEditingLabel(false);
                                        panel.setLabel(account.accountLabel);
                                    }}>
                                    {text('cancel')}
                                </Button>
                            </>
                        ) : (
                            <>
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
                theme={theme}
                backdropClassName="dsh-core-root"
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div data-testid={`${TestId.OpenAIHub.ModalScrollBody}-${account.accountLabel}`} className={styles.modalBody}>
                    <section className={styles.modelList} aria-label={text('models')}>
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
                                            aria-label={`${text(index > 0 ? 'moveUp' : 'moveDown')}: ${model.name}`}
                                            aria-keyshortcuts="ArrowUp ArrowDown"
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
                                            <span aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className={`${styles.modelCell} ${styles.modelIdColumn} ${styles.modelId}`}>{model.id}</div>
                                    <div className={`${styles.modelCell} ${styles.modelNameColumn}`}>
                                        <input
                                            aria-label={`${text('modelName')}: ${model.id}`}
                                            value={model.name}
                                            onChange={event => panel.updateModel(index, { name: event.currentTarget.value })}
                                        />
                                    </div>
                                    <div className={`${styles.modelCell} ${styles.modelEnabledColumn}`}>
                                        <label className={styles.checkLabel}>
                                            <input
                                                className="dsh-checkbox"
                                                type="checkbox"
                                                checked={model.enabled}
                                                onChange={event => panel.updateModel(index, { enabled: event.currentTarget.checked })}
                                            />
                                            {text('enabled')}
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
                <div className={styles.modalFooter}>
                    {panel.error ? <p role="alert">{panel.error}</p> : undefined}
                    <div className={styles.actionsRight}>
                        <Button
                            variant="primary"
                            disabled={panel.busy || !panel.draft.some(model => model.enabled)}
                            onClick={() => void panel.saveModels()}>
                            {text('save')}
                        </Button>
                        <Button onClick={() => panel.setModelModalOpen(false)}>{text('cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal
                open={Boolean(panel.resetCard)}
                onClose={() => panel.setResetCard('')}
                title={text('resetConfirmTitle')}
                closeLabel={text('close')}
                theme={theme}
                backdropClassName="dsh-core-root"
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.modalBody}>
                    <p>{text('resetConfirm')}</p>
                    {panel.error ? <p role="alert">{panel.error}</p> : undefined}
                </div>
                <div className={styles.modalFooter}>
                    <div className={styles.actionsRight}>
                        <Button variant="danger" disabled={panel.busy} onClick={() => void panel.confirmReset()}>
                            {text('confirm')}
                        </Button>
                        <Button disabled={panel.busy} onClick={() => panel.setResetCard('')}>
                            {text('cancel')}
                        </Button>
                    </div>
                </div>
            </Modal>
            <Modal
                open={panel.deleteModalOpen}
                onClose={() => panel.setDeleteModalOpen(false)}
                title={text('deleteAccount')}
                closeLabel={text('close')}
                theme={theme}
                backdropClassName="dsh-core-root"
                {...(styles.modalCard ? { cardClassName: styles.modalCard } : {})}>
                <div className={styles.modalBody}>
                    <p>{text('deleteAccountConfirm')}</p>
                    {panel.error ? <p role="alert">{panel.error}</p> : undefined}
                </div>
                <div className={styles.modalFooter}>
                    <div className={styles.actionsRight}>
                        <Button variant="danger" disabled={panel.busy} onClick={() => void panel.deleteAccount()}>
                            {text('deleteAccount')}
                        </Button>
                        <Button disabled={panel.busy} onClick={() => panel.setDeleteModalOpen(false)}>
                            {text('cancel')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
