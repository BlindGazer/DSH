import { type DshActiveLocale, Tooltip } from '@kalex/dsh-core';
import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.ts';

export interface ContextBarProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    locale: DshActiveLocale;
}

export function ContextBar({ data, t, locale }: ContextBarProps): React.JSX.Element {
    const rulesCount = data.metrics.rules?.characters ?? 0;
    const areasCount = data.metrics.areaCatalog?.characters ?? 0;
    const skillsCount = data.metrics.skillCatalog?.characters ?? 0;
    const loadedCount = data.metrics.loadedSkills?.characters ?? 0;

    const values: [string, number, string][] = [
        [t('rulesLabel'), rulesCount, 'ar-blue'],
        [t('areasLabel'), areasCount, 'ar-violet'],
        [t('skillCatalogMetric'), skillsCount, 'ar-amber'],
        [t('invokedSkills'), loadedCount, 'ar-green']
    ];
    const stackColumns = values.map(([, count]) => `${count}fr`).join(' ');

    return (
        <>
            <div className="ar-stack" style={{ gridTemplateColumns: stackColumns }}>
                {values.map(([name, count, color]) => (
                    <Tooltip key={color} className={color} content={`${name}: ${count.toLocaleString(locale)}`} triggerElement="span">
                        {null}
                    </Tooltip>
                ))}
            </div>
            <div className="ar-grid ar-legend">
                {values.map(([name, count, color]) => (
                    <div className="ar-subcard" key={color}>
                        <span className={`ar-dot ${color}`} />
                        {name}
                        <strong>
                            {count.toLocaleString(locale)} {t('chars')}
                        </strong>
                    </div>
                ))}
            </div>
        </>
    );
}

export interface TokenPoint {
    timestamp: number;
    tokens: number;
}

export interface TokenChartProps {
    points: TokenPoint[];
    budget: number;
    locale: DshActiveLocale;
    t: (key: string) => string;
}

export function TokenChart({ points, budget, locale, t }: TokenChartProps): React.JSX.Element {
    if (!points.length) return <p className="ar-muted">{t('loading')}</p>;

    const width = 600;
    const height = 120;
    const max = Math.max(budget * 1.15, ...points.map(point => point.tokens), 1);
    const coords = points.map((point, index) => ({
        x: points.length === 1 ? width / 2 : 12 + (index / (points.length - 1)) * (width - 24),
        y: height - 10 - (Math.min(max, point.tokens) / max) * (height - 24)
    }));
    const line = coords.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
    const lastPoint = coords.at(-1);
    const firstPoint = coords[0];
    const area = lastPoint && firstPoint ? `${line} L${lastPoint.x},${height} L${firstPoint.x},${height} Z` : line;
    const budgetY = height - 10 - (budget / max) * (height - 24);
    const formatTime = (point?: TokenPoint): string => (point ? new Date(point.timestamp).toLocaleTimeString(locale) : '');

    return (
        <div className="ar-chart">
            <svg viewBox={`0 0 ${width} ${height}`}>
                <path d={area} className="ar-chart-area" />
                <path d={line} className="ar-chart-line" />
                <line x1="0" x2={width} y1={budgetY} y2={budgetY} className="ar-chart-budget" />
                {coords.map(point => (
                    <circle key={point.x} cx={point.x} cy={point.y} r="3" className="ar-chart-point" />
                ))}
            </svg>
            <div className="ar-chart-labels">
                <span>{formatTime(points[0])}</span>
                <span>{formatTime(points.at(-1))}</span>
            </div>
        </div>
    );
}
