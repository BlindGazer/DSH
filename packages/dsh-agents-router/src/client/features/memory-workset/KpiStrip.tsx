import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.js';

export interface KpiStripProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    lastPoint: number;
    percent: number;
}

export function KpiStrip({ data, t, lastPoint, percent }: KpiStripProps): React.JSX.Element {
    const rulesCount = data.metrics.rules?.count ?? 0;
    const skillsCount = data.metrics.skillCatalog?.count ?? 0;
    const loadedCount = data.metrics.loadedSkills?.count ?? 0;
    const rulesCharacters = data.metrics.rules?.characters ?? 0;
    const skillsCharacters = data.metrics.skillCatalog?.characters ?? 0;

    return (
        <section className="ar-kpis">
            <Kpi title={t('rules')} value={`${rulesCount}`} detail={`${rulesCharacters.toLocaleString()} ${t('chars')}`} />
            <Kpi
                title={t('workset')}
                value={`${data.settings?.rootInstructionFileNames?.length ?? 0} ${t('paths')}`}
                detail={data.status === 'idle' ? t('idleState') : t('running')}
            />
            <Kpi
                title={t('skills')}
                value={`${skillsCount} / ${loadedCount}`}
                detail={`${skillsCharacters.toLocaleString()} ${t('chars')}`}
            />
            <Kpi
                title={t('memoryBudget')}
                value={`${lastPoint.toLocaleString()} / ${data.metrics.tokenBudget.toLocaleString()}`}
                detail={`${percent.toFixed(1)}%`}
                tone={percent > 100 ? 'danger' : percent >= 70 ? 'warn' : 'success'}
            />
        </section>
    );
}

export interface KpiProps {
    title: string;
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
