import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.js';
export interface KpiStripProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    lastPoint: number;
    percent: number;
}
export declare function KpiStrip({ data, t, lastPoint, percent }: KpiStripProps): React.JSX.Element;
export interface KpiProps {
    title: string;
    value: string;
    detail: string;
    tone?: 'danger' | 'warn' | 'success';
}
export declare function Kpi({ title, value, detail, tone }: KpiProps): React.JSX.Element;
