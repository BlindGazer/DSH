import { buildCoreThemeStyles, Spinner, useDshThemeRevision } from '@kalex/dsh-core';
import type React from 'react';
import { useRef, useState } from 'react';
import { AuditProjectTab } from '../features/audit-project/AuditProjectTab.js';
import { CatalogTab } from '../features/catalog/CatalogTab.js';
import { DiagnosticsTab } from '../features/diagnostics/DiagnosticsTab.js';
import { GlobalSettingsCard } from '../features/global-settings/GlobalSettingsCard.js';
import { RouterHeader } from '../features/header/RouterHeader.js';
import { KpiStrip } from '../features/memory-workset/KpiStrip.js';
import { MemoryWorksetTab } from '../features/memory-workset/MemoryWorksetTab.js';
import { useRouterActions } from '../features/router/hooks/useRouterActions.js';
import { useRouterAuditLog } from '../features/router/hooks/useRouterAuditLog.js';
import { useRouterData } from '../features/router/hooks/useRouterData.js';
import { useRouterPolling } from '../features/router/hooks/useRouterPolling.js';
import { useRouterVisibility } from '../features/router/hooks/useRouterVisibility.js';
import { locales, resolveLocale } from '../locales/index.js';
import { useEffectiveTheme } from '../theme/useEffectiveTheme.js';
import { getHostLocale } from '../utils/locale-context.js';
import styles from './routerStyles.module.scss';
import routerStyleText from './routerStyles.module.scss?inline';

const TAB_KEYS = ['memory', 'catalog', 'diagnostics', 'auditProject'] as const;

export interface RouterViewProps {
    sessionId: string;
}

export function RouterView({ sessionId }: RouterViewProps): React.JSX.Element {
    const rootRef = useRef<HTMLElement | null>(null);
    const [tab, setTab] = useState<'memory' | 'catalog' | 'diagnostics' | 'auditProject'>('memory');
    const [filter, setFilter] = useState<'all' | 'active' | 'skipped'>('all');
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const { data, settings, setSettings, error, setError, busy, notice, setNotice, slowPoll, points, reload, post, run } =
        useRouterData(sessionId);
    const hostVisible = useRouterVisibility(rootRef);
    const { auditText, setAuditText } = useRouterAuditLog(sessionId, tab === 'auditProject', setError);
    const actions = useRouterActions({ settings, setSettings, post, run, auditText, setAuditText, setError, setNotice });
    const pollInterval = data?.globalSettings?.pollingIntervalMs ?? 3000;
    const pollActive = tab === 'memory' && hostVisible;
    const effectiveTheme = useEffectiveTheme(data?.globalSettings?.theme ?? 'auto', rootRef);
    const themeRevision = useDshThemeRevision();
    useRouterPolling(pollActive, pollInterval, reload);
    const locale = resolveLocale(data?.globalSettings.locale, getHostLocale());
    const t = (key: string): string => (locales[locale] as Record<string, string>)[key] ?? key;

    if (!data || !settings) {
        const inactiveSession = error.includes('session is not active in this DSH process');
        return (
            <main ref={rootRef} className={`ar-root ${styles.scope}`} data-theme={effectiveTheme}>
                <style data-theme-revision={themeRevision}>{`${buildCoreThemeStyles()}\n${routerStyleText}`}</style>
                <h2>{t('router')}</h2>
                {error ? (
                    <>
                        <p role="alert">{inactiveSession ? t('inactiveSession') : error}</p>
                        {inactiveSession ? (
                            <button
                                type="button"
                                className="ar-btn"
                                disabled={busy}
                                onClick={() =>
                                    void run(async () => {
                                        await post('reinitialize');
                                    })
                                }>
                                {busy ? t('loading') : t('reloadRouter')}
                            </button>
                        ) : null}
                    </>
                ) : (
                    <Spinner />
                )}
            </main>
        );
    }

    const activeRules = data.rules.filter(rule => rule.selected);
    const matched = activeRules.filter(rule => !rule.appliesTo.includes('always'));
    const always = activeRules.filter(rule => rule.appliesTo.includes('always'));
    const lastPoint = points.at(-1)?.tokens ?? data.metrics.estimatedTokens;
    const percent = data.metrics.tokenBudget ? (lastPoint / data.metrics.tokenBudget) * 100 : 0;

    return (
        <main ref={rootRef} className={`ar-root ${styles.scope}`} data-theme={effectiveTheme}>
            <style data-theme-revision={themeRevision}>{`${buildCoreThemeStyles()}\n${routerStyleText}`}</style>
            <RouterHeader
                data={data}
                t={t}
                pollActive={pollActive}
                slowPoll={slowPoll}
                pollInterval={pollInterval}
                busy={busy}
                run={run}
                post={post}
                onSettings={() => setShowGlobalSettings(true)}
            />
            {error ? (
                <p className="ar-error" role="alert">
                    {error}
                </p>
            ) : null}
            {data.auditWarning ? (
                <p className="ar-warning" role="status">
                    {data.auditWarning}
                </p>
            ) : null}
            <KpiStrip data={data} t={t} lastPoint={lastPoint} percent={percent} />
            <div className="ar-tabs" role="tablist" aria-label={t('router')}>
                {TAB_KEYS.map((key, index) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        className={`ar-tab-btn${tab === key ? ' selected' : ''}`}
                        onClick={() => setTab(key)}>
                        {t(key)}
                        {index === 1 ? ` (${data.rules.length})` : index === 2 ? ` (${data.diagnostics.length})` : ''}
                    </button>
                ))}
            </div>

            {tab === 'memory' ? (
                <MemoryWorksetTab
                    data={data}
                    t={t}
                    points={points}
                    path={actions.path}
                    setPath={actions.setPath}
                    openFile={actions.openFile}
                    addPath={actions.addPath}
                    busy={busy}
                    run={run}
                    post={post}
                    activeRules={activeRules}
                    matched={matched}
                    always={always}
                />
            ) : null}

            {tab === 'catalog' ? <CatalogTab data={data} t={t} filter={filter} setFilter={setFilter} openFile={actions.openFile} /> : null}

            {tab === 'diagnostics' ? (
                <DiagnosticsTab
                    data={data}
                    t={t}
                    inspect={actions.inspect}
                    inspectPath={actions.inspectPath}
                    setInspectPath={actions.setInspectPath}
                    busy={busy}
                    diagnosis={actions.diagnosis}
                />
            ) : null}

            {tab === 'auditProject' ? (
                <AuditProjectTab
                    data={data}
                    t={t}
                    auditText={auditText}
                    copyLog={() => actions.copyLog(t('copied'))}
                    clearLog={() => actions.clearLog(t('deleted'))}
                    settings={settings}
                    updateCategory={actions.updateCategory}
                    updateProject={actions.updateProject}
                    saveProject={event => actions.saveProject(event, t('saved'))}
                    notice={notice}
                    busy={busy}
                />
            ) : null}

            {showGlobalSettings ? (
                <div className="ar-modal" role="dialog" aria-modal="true" aria-label={t('globalSettings')}>
                    <GlobalSettingsCard isModal onClose={() => setShowGlobalSettings(false)} />
                </div>
            ) : null}
        </main>
    );
}
