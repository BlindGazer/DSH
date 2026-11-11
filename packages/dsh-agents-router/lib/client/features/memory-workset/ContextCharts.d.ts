import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.js';
export interface ContextBarProps {
    data: RouterStateResponse;
    t: (key: string) => string;
}
export declare function ContextBar({ data, t }: ContextBarProps): React.JSX.Element;
export interface TokenPoint {
    label: string;
    tokens: number;
}
export interface TokenChartProps {
    points: TokenPoint[];
    budget: number;
}
export declare function TokenChart({ points, budget }: TokenChartProps): React.JSX.Element;
