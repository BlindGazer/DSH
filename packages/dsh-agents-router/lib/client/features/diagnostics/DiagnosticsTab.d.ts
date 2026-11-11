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
export declare function DiagnosticsTab({ data, t, inspect, inspectPath, setInspectPath, busy, diagnosis }: DiagnosticsTabProps): React.JSX.Element;
