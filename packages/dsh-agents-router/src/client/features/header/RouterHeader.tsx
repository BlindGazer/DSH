import type React from 'react';
import type { RouterPostBody, RouterStateResponse } from '../../../shared/models/RouterModels.js';

export interface RouterHeaderProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    pollActive: boolean;
    slowPoll: boolean;
    pollInterval: number;
    busy: boolean;
    run: (action: () => Promise<void>) => Promise<void>;
    post: <T = void>(route: string, body?: RouterPostBody) => Promise<T>;
    onSettings: () => void;
}

export function RouterHeader({
    data,
    t,
    pollActive,
    slowPoll,
    pollInterval,
    busy,
    run,
    post,
    onSettings
}: RouterHeaderProps): React.JSX.Element {
    return (
        <header className="ar-header">
            <div className="ar-header-title">
                <div className="ar-muted" title={data.projectRoot}>
                    {data.projectRoot}
                </div>
                <h1>
                    {t('router')} <span className="ar-muted">{data.sessionId}</span>
                </h1>
                <span className="ar-muted">{data.status === 'idle' ? t('idle') : t('running')}</span>
            </div>
            <div className="ar-actions">
                <span className={`ar-pill ar-sync-badge ${pollActive ? 'ar-live' : ''}`}>
                    {pollActive
                        ? `${t('autoSync')}: ${slowPoll ? '10' : pollInterval / 1000}${t('seconds')}`
                        : `${t('autoSync')}: ${t('paused')}`}
                </span>
                <button className="ar-btn ar-btn-header" type="button" disabled={busy} onClick={() => void run(() => post('refresh'))}>
                    {t('refresh')}
                </button>
                <button
                    className="ar-btn ar-btn-header"
                    type="button"
                    disabled={busy || !data.canReset}
                    onClick={() => void run(() => post('reset'))}>
                    {t('reset')}
                </button>
                <button className="ar-btn ar-btn-header" type="button" onClick={onSettings}>
                    {t('pluginSettings')}
                </button>
            </div>
        </header>
    );
}
