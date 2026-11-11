import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.js';

export interface ContextBarProps {
    data: RouterStateResponse;
    t: (key: string) => string;
}

export function ContextBar({ data, t }: ContextBarProps): React.JSX.Element {
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
    const total = values.reduce((sum, item) => sum + item[1], 0);

    return (
        <>
            <div className="ar-stack">
                {values.map(([name, count, color]) => (
                    <span
                        key={name}
                        className={color}
                        style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                        title={`${name}: ${count}`}
                    />
                ))}
            </div>
            <div className="ar-grid ar-legend">
                {values.map(([name, count, color]) => (
                    <div className="ar-subcard" key={name}>
                        <span className={`ar-dot ${color}`} />
                        {name}
                        <strong>
                            {count.toLocaleString()} {t('chars')}
                        </strong>
                    </div>
                ))}
            </div>
        </>
    );
}

export interface TokenPoint {
    label: string;
    tokens: number;
}

export interface TokenChartProps {
    points: TokenPoint[];
    budget: number;
}

export function TokenChart({ points, budget }: TokenChartProps): React.JSX.Element {
    if (!points.length) return <p className="ar-muted">Loading...</p>;

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
    const lastLabel = points.at(-1)?.label ?? '';

    return (
        <div className="ar-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Token usage history">
                <path d={area} className="ar-chart-area" />
                <path d={line} className="ar-chart-line" />
                <line x1="0" x2={width} y1={budgetY} y2={budgetY} className="ar-chart-budget" />
                {coords.map(point => (
                    <circle key={point.x} cx={point.x} cy={point.y} r="3" className="ar-chart-point" />
                ))}
            </svg>
            <div className="ar-chart-labels">
                <span>{points[0]?.label}</span>
                <span>{lastLabel}</span>
            </div>
        </div>
    );
}
