import type React from 'react';
import type { ProjectSettings, RouterStateResponse } from '../../../shared/models/RouterModels.js';
export interface AuditProjectTabProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    auditText: string;
    copyLog: () => Promise<void>;
    clearLog: () => void;
    settings: ProjectSettings;
    updateCategory: (category: 'events' | 'preflight' | 'rulesDiff' | 'workset', checked: boolean) => void;
    updateProject: <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => void;
    saveProject: (event: React.FormEvent) => Promise<void>;
    notice: string;
    busy: boolean;
}
export declare function AuditProjectTab({ data, t, auditText, copyLog, clearLog, settings, updateCategory, updateProject, saveProject, notice, busy }: AuditProjectTabProps): React.JSX.Element;
