import type React from 'react';
import { useState } from 'react';
import type { DiagnosisData, ProjectSettings, RouterPostBody } from '../../../../shared/models/RouterModels.js';
import { cleanNameList } from '../../../utils/name-list.js';

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

export function useRouterActions({ settings, setSettings, post, run, auditText, setAuditText, setError, setNotice }: RouterActionOptions) {
    const [path, setPath] = useState('');
    const [inspectPath, setInspectPath] = useState('');
    const [diagnosis, setDiagnosis] = useState<DiagnosisData>();

    const updateProject = <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]): void => {
        setSettings(current => (current ? { ...current, [key]: value } : current));
    };
    const updateCategory = (category: keyof ProjectSettings['logCategories'], checked: boolean): void => {
        setSettings(current =>
            current
                ? {
                      ...current,
                      logCategories: { ...current.logCategories, [category]: checked }
                  }
                : current
        );
    };
    const saveProject = (event: React.FormEvent, savedMessage: string): Promise<void> => {
        event.preventDefault();
        if (!settings) return Promise.resolve();
        return run(async () => {
            await post('settings', {
                settings: {
                    ...settings,
                    tokenBudget: Number(settings.tokenBudget),
                    rootInstructionFileNames: cleanNameList(settings.rootInstructionFileNames),
                    instructionDirectoryNames: cleanNameList(settings.instructionDirectoryNames)
                }
            });
            setNotice(savedMessage);
        });
    };
    const addPath = (event: React.FormEvent): void => {
        event.preventDefault();
        if (!path.trim()) return;
        const value = path.trim();
        void run(async () => {
            await post('workset', { action: 'add', path: value });
            setPath('');
        });
    };
    const inspect = (event: React.FormEvent): void => {
        event.preventDefault();
        if (!inspectPath.trim()) return;
        void run(async () => {
            const result = await post<DiagnosisData>('diagnose', { path: inspectPath.trim() });
            setDiagnosis(result);
        });
    };
    const clearLog = (deletedMessage: string): void => {
        void run(async () => {
            await post('audit/delete');
            setAuditText('');
            setNotice(deletedMessage);
        });
    };
    const openFile = async (filePath: string): Promise<void> => {
        try {
            await post('open-file', { path: filePath });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    };

    const copyLog = async (copiedMessage: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(auditText);
            setNotice(copiedMessage);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    };

    return {
        path,
        setPath,
        inspectPath,
        setInspectPath,
        diagnosis,
        updateProject,
        updateCategory,
        saveProject,
        addPath,
        inspect,
        clearLog,
        copyLog,
        openFile
    };
}
