import { useEffect, useState } from 'react';
import type { ModelChoice, OpenAICodexSnapshot, ResetRequest } from '../../../shared/remote.js';
import { USAGE_POLL_ACTIVE_MS } from './codexPresentation.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import { useCodexState } from './openAICodexRuntime.js';

export interface CodexSettingsHook {
    readonly snapshot?: OpenAICodexSnapshot | undefined;
    readonly loading: boolean;
    readonly error?: string | undefined;
    readonly busy: boolean;
    startLogin(): Promise<void>;
    logout(): Promise<void>;
    setProxy(mode: 'host' | 'system'): Promise<void>;
    saveModels(models: readonly ModelChoice[]): Promise<void>;
    consumeReset(request: ResetRequest): Promise<OpenAICodexSnapshot>;
    deleteAllData(): Promise<void>;
    refresh(): Promise<void>;
}

/**
 * Опрашивает состояние провайдера, пока открыт модальное окно настроек.
 * @param paused приостанавливает фоновый опрос (например, пока открыт под-режим правки списка моделей).
 */
export function useCodexSettings(controller: OpenAICodexController, paused = false): CodexSettingsHook {
    const state = useCodexState(controller);
    const [busy, setBusy] = useState(false);

    const loginPending = state.snapshot?.status === 'starting' || state.snapshot?.status === 'waiting';

    useEffect(() => {
        if (state.status === 'loading') void controller.load();
        // Пока открыт под-режим правки моделей, опрос лимитов останавливается до его закрытия.
        if (paused) return undefined;
        const timer = setInterval(() => void controller.load(true), loginPending ? 2_500 : USAGE_POLL_ACTIVE_MS);
        return () => clearInterval(timer);
    }, [controller, state.status, loginPending, paused]);

    const run = async (action: () => Promise<OpenAICodexSnapshot>): Promise<void> => {
        setBusy(true);
        try {
            await action();
        } finally {
            setBusy(false);
        }
    };

    return {
        snapshot: state.snapshot,
        loading: state.status === 'loading',
        error: state.error,
        busy,
        startLogin: () => run(() => controller.startLogin()),
        logout: () => run(() => controller.logout()),
        setProxy: mode => run(() => (mode === 'system' ? controller.setSystemProxy() : controller.setHostProxy())),
        saveModels: models => run(() => controller.saveModels(models)),
        deleteAllData: () => run(() => controller.deleteAllData()),
        consumeReset: async request => {
            setBusy(true);
            try {
                return await controller.consumeReset(request);
            } finally {
                setBusy(false);
            }
        },
        refresh: () => controller.load()
    };
}
