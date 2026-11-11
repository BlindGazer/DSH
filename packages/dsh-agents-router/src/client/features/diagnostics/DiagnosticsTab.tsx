import type React from 'react';
import type { DiagnosisData, RouterStateResponse } from '../../../shared/models/RouterModels.js';

export interface DiagnosticsTabProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    inspect: (event: React.FormEvent) => void;
    inspectPath: string;
    setInspectPath: (path: string) => void;
    busy: boolean;
    diagnosis?: DiagnosisData | undefined;
}

export function DiagnosticsTab({ data, t, inspect, inspectPath, setInspectPath, busy, diagnosis }: DiagnosticsTabProps): React.JSX.Element {
    return (
        <section className="ar-panel">
            <article className="ar-card">
                <h2>
                    {t('warnings')} ({data.diagnostics.length})
                </h2>
                {data.diagnostics.length ? (
                    <ul className="ar-list">
                        {data.diagnostics.map((item: { key: string; path: string; code: string; message: string }) => (
                            <li key={item.key}>
                                <span>
                                    <code>{item.code}</code> {item.path}: {item.message}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="ar-muted">{t('noWarnings')}</p>
                )}
            </article>
            <article className="ar-card">
                <h2>{t('inspect')}</h2>
                <form className="ar-inline" onSubmit={inspect}>
                    <input
                        aria-label={t('path')}
                        placeholder={t('inspectPlaceholder')}
                        value={inspectPath}
                        onChange={event => setInspectPath(event.target.value)}
                    />
                    <button className="ar-btn" disabled={busy} type="submit">
                        {t('check')}
                    </button>
                </form>
                {diagnosis?.note ? <p className="ar-muted">{diagnosis.note}</p> : null}
                {diagnosis?.results?.map(row => (
                    <div className="ar-grid" key={row.path}>
                        <article className="ar-subcard">
                            <h3>{t('connected')}</h3>
                            {row.rules
                                .filter(rule => rule.applies)
                                .map(rule => (
                                    <p key={rule.source}>
                                        <code>{rule.source}</code>
                                        <small>{rule.reason}</small>
                                    </p>
                                ))}
                        </article>
                        <article className="ar-subcard">
                            <h3>{t('skippedRules')}</h3>
                            {row.rules
                                .filter(rule => !rule.applies)
                                .map(rule => (
                                    <p key={rule.source}>
                                        <code>{rule.source}</code>
                                        <small>{rule.reason}</small>
                                    </p>
                                ))}
                        </article>
                    </div>
                ))}
            </article>
            <article className="ar-card">
                <details>
                    <summary>{t('coverage')}</summary>
                    <ul className="ar-list">
                        {data.coverage?.map((item: { tool: string; pathField: string; coverage: string }) => (
                            <li key={item.tool}>
                                <code>{item.tool}</code>
                                <span>
                                    {item.pathField}: {item.coverage}
                                </span>
                            </li>
                        ))}
                    </ul>
                </details>
            </article>
        </section>
    );
}
