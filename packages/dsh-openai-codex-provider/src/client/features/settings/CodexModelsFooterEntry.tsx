import { Button, Modal, useEffectiveTheme } from '@kalex/dsh-core';
import { useEffect, useState } from 'react';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { TestId } from '../../../shared/constants/testId.js';
import { CodexSettingsPanel } from './CodexSettingsPanel.js';
import { CircularUsageChart } from './CodexUsageCharts.js';
import styles from './codexFooterStyles.module.scss';
import { findUsageLimit } from './codexPresentation.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import { useCodexState } from './openAICodexRuntime.js';

export interface CodexModelsFooterEntryProps {
    readonly controller: OpenAICodexController;
    readonly locale: 'en' | 'ru';
    readonly text: (key: OpenAICodexText) => string;
}

export function CodexModelsFooterEntry({ controller, locale, text }: CodexModelsFooterEntryProps) {
    const [open, setOpen] = useState(false);
    const theme = useEffectiveTheme();
    const state = useCodexState(controller);
    const status = state.snapshot?.status;
    const usageStatus = state.snapshot?.usageStatus;
    const loggedIn = Boolean(state.snapshot?.loggedIn);
    const models = Array.isArray(state.snapshot?.models) ? state.snapshot.models : [];
    const enabledModels = models.filter(model => model.enabled).length;
    const fiveHour = loggedIn && state.snapshot ? findUsageLimit(state.snapshot.usageLimits, 18_000) : undefined;
    const weekly = loggedIn && state.snapshot ? findUsageLimit(state.snapshot.usageLimits, 604_800) : undefined;
    const pollInterval = status === 'starting' || status === 'waiting' || usageStatus === 'loading' ? 2_500 : 60_000;

    useEffect(() => {
        if (open) return undefined;
        void controller.load(true);
        const timer = window.setInterval(() => void controller.load(true), pollInterval);
        return () => window.clearInterval(timer);
    }, [controller, open, pollInterval]);

    return (
        <>
            <div className={`dsh-core-root ${styles.container}`} data-theme={theme} data-testid={TestId.OpenAICodex.ModelsFooter}>
                <div className={styles.row}>
                    <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                        {text('title')}
                    </Button>
                    <div
                        className={styles.quotaCharts}
                        role="status"
                        aria-live="polite"
                        aria-label={loggedIn ? text('usage') : text('signInRequired')}>
                        {loggedIn ? (
                            <div className={styles.modelsUsageGroup}>
                                <span className={styles.modelsUsageSummary}>
                                    {text('modelsEnabledSummary')
                                        .replace('{enabled}', String(enabledModels))
                                        .replace('{total}', String(models.length))}
                                </span>
                                <span className={styles.modelsEnabledSegments} aria-hidden="true">
                                    {models.map(model => (
                                        <span key={model.id} className={styles.modelsEnabledSegment} data-enabled={model.enabled} />
                                    ))}
                                </span>
                                <span className={styles.modelsUsageIndicators}>
                                    {fiveHour ? (
                                        <CircularUsageChart limit={fiveHour} label={text('fiveHourLimit')} size="standard" />
                                    ) : undefined}
                                    {weekly ? <CircularUsageChart limit={weekly} label={text('weeklyLimit')} size="standard" /> : undefined}
                                </span>
                            </div>
                        ) : state.snapshot ? (
                            text('signInRequired')
                        ) : undefined}
                    </div>
                </div>
            </div>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={text('title')}
                closeLabel={text('close')}
                {...(styles.modalCard === undefined ? {} : { cardClassName: styles.modalCard })}>
                <section className={styles.modalContent}>
                    <CodexSettingsPanel controller={controller} locale={locale} text={text} hideHeading />
                </section>
            </Modal>
        </>
    );
}
