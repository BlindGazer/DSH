import { type DshActiveLocale, Tooltip } from '@kalex/dsh-core';
import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.ts';

export interface KpiStripProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    lastPoint: number;
    percent: number;
    locale: DshActiveLocale;
}

export function KpiStrip({ data, t, lastPoint, percent, locale }: KpiStripProps): React.JSX.Element {
    const rulesCount = data.metrics.rules?.count ?? 0;
    const skillsCount = data.metrics.skillCatalog?.count ?? 0;
    const loadedCount = data.metrics.loadedSkills?.count ?? 0;
    const rulesCharacters = data.metrics.rules?.characters ?? 0;
    const skillsCharacters = data.metrics.skillCatalog?.characters ?? 0;

    return (
        <section className="ar-kpis">
            <Kpi
                title={t('rules')}
                value={rulesCount.toLocaleString(locale)}
                detail={`${rulesCharacters.toLocaleString(locale)} ${t('chars')}`}
            />
            <Kpi
                title={t('workset')}
                value={`${(data.settings?.rootInstructionFileNames?.length ?? 0).toLocaleString(locale)} ${t('paths')}`}
                detail={data.status === 'idle' ? t('idleState') : t('running')}
            />
            <Kpi
                title={t('skills')}
                value={`${skillsCount.toLocaleString(locale)} / ${loadedCount.toLocaleString(locale)}`}
                detail={`${skillsCharacters.toLocaleString(locale)} ${t('chars')}`}
            />
            <Kpi
                title={
                    <span className="ar-kpi-title">
                        {t('memoryBudget')}
                        <Tooltip content={t('memoryBudgetHint')} triggerElement="span">
                            <span className="ar-help">?</span>
                        </Tooltip>
                    </span>
                }
                value={`${lastPoint.toLocaleString(locale)} / ${data.metrics.tokenBudget.toLocaleString(locale)}`}
                detail={`${(percent / 100).toLocaleString(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                tone={percent > 100 ? 'danger' : percent >= 70 ? 'warn' : 'success'}
            />
        </section>
    );
}

export interface KpiProps {
    title: React.ReactNode;
    value: string;
    detail: string;
    tone?: 'danger' | 'warn' | 'success';
}

export function Kpi({ title, value, detail, tone }: KpiProps): React.JSX.Element {
    return (
        <article className="ar-card ar-kpi">
            <div className="ar-muted">{title}</div>
            <div className={`ar-kpi-value ${tone ? `ar-${tone}` : ''}`}>{value}</div>
            <div className="ar-muted">{detail}</div>
        </article>
    );
}
