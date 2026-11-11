import type React from 'react';
import type { DiagnosisData, ProjectSettings, RouterPostBody } from '../../../../shared/models/RouterModels.js';
interface RouterActionOptions {
    settings: ProjectSettings | undefined;
    setSettings: React.Dispatch<React.SetStateAction<ProjectSettings | undefined>>;
    post<T = void>(route: string, body?: RouterPostBody): Promise<T>;
    run(action: () => Promise<void>): Promise<void>;
    auditText: string;
    setAuditText(value: string): void;
    setError(value: string): void;
    setNotice(value: string): void;
}
export declare function useRouterActions({ settings, setSettings, post, run, auditText, setAuditText, setError, setNotice }: RouterActionOptions): {
    path: string;
    setPath: React.Dispatch<React.SetStateAction<string>>;
    inspectPath: string;
    setInspectPath: React.Dispatch<React.SetStateAction<string>>;
    diagnosis: DiagnosisData | undefined;
    updateProject: <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => void;
    updateCategory: (category: keyof ProjectSettings['logCategories'], checked: boolean) => void;
    saveProject: (event: React.FormEvent, savedMessage: string) => Promise<void>;
    addPath: (event: React.FormEvent) => void;
    inspect: (event: React.FormEvent) => void;
    clearLog: (deletedMessage: string) => void;
    copyLog: (copiedMessage: string) => Promise<void>;
    openFile: (filePath: string) => Promise<void>;
};
export {};
