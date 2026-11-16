import type { SelectOption } from '@kalex/dsh-core';
import { useState } from 'react';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type { ModelChoice, OpenAICodexSnapshot, ResetRequest } from '../../../shared/remote.js';
import { moveModel } from './modelSettings.js';
import type { OpenAICodexController } from './openAICodexRuntime.js';
import type { CodexSettingsHook } from './useCodexSettings.js';
import { useCodexSettings } from './useCodexSettings.js';

const RESET_CREDIT_KEY = '@kalex/dsh-openai-codex-provider.pending-reset-credit';
const RESET_REQUEST_KEY = '@kalex/dsh-openai-codex-provider.pending-reset-request';

export interface CodexSettingsPanelState {
    readonly codex: CodexSettingsHook;
    readonly snapshot?: OpenAICodexSnapshot | undefined;
    readonly editOpen: boolean;
    readonly draft: readonly ModelChoice[];
    readonly resetCard?: string | undefined;
    readonly pendingReset?: ResetRequest | undefined;
    readonly actionError?: string | undefined;
    readonly copyStatus?: string | undefined;
    readonly proxyOptions: readonly SelectOption<'host' | 'system'>[];
    beginEdit(): void;
    startLogin(): Promise<void>;
    closeEdit(): void;
    updateModel(id: string, patch: Partial<ModelChoice>): void;
    reorderModel(id: string, direction: 'up' | 'down'): void;
    saveModels(): Promise<void>;
    copyDeviceCode(code: string): Promise<void>;
    runAction(action: () => Promise<void>): Promise<void>;
    selectResetCard(creditId: string): void;
    retryPendingReset(): void;
    closeReset(): void;
    confirmReset(): Promise<void>;
}

function readPendingReset(): ResetRequest | undefined {
    try {
        const creditId = sessionStorage.getItem(RESET_CREDIT_KEY);
        const idempotencyKey = sessionStorage.getItem(RESET_REQUEST_KEY);
        if (
            !creditId ||
            !idempotencyKey ||
            !/^[A-Za-z0-9_-]{1,200}$/.test(creditId) ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)
        )
            return undefined;
        return { creditId, idempotencyKey, confirmed: true };
    } catch {
        return undefined;
    }
}

function clearPendingReset(): void {
    try {
        sessionStorage.removeItem(RESET_CREDIT_KEY);
        sessionStorage.removeItem(RESET_REQUEST_KEY);
    } catch {
        return;
    }
}

function savePendingReset(request: ResetRequest): void {
    try {
        sessionStorage.setItem(RESET_CREDIT_KEY, request.creditId);
        sessionStorage.setItem(RESET_REQUEST_KEY, request.idempotencyKey);
    } catch {
        return;
    }
}

export function useCodexSettingsPanel(controller: OpenAICodexController, text: (key: OpenAICodexText) => string): CodexSettingsPanelState {
    const codex = useCodexSettings(controller);
    const [editOpen, setEditOpen] = useState(false);
    const [resetCard, setResetCard] = useState<string | undefined>(undefined);
    const [pendingReset, setPendingReset] = useState<ResetRequest | undefined>(readPendingReset);
    const [draft, setDraft] = useState<readonly ModelChoice[]>([]);
    const [actionError, setActionError] = useState<string | undefined>(undefined);
    const [copyStatus, setCopyStatus] = useState<string | undefined>(undefined);
    const snapshot = codex.snapshot;

    const beginEdit = (): void => {
        setActionError(undefined);
        setDraft(Array.isArray(snapshot?.models) ? snapshot.models.map(model => ({ ...model })) : []);
        setEditOpen(true);
    };

    const startLogin = async (): Promise<void> => {
        // OAuth ждёт завершения входа, поэтому окно нужно открыть до await.
        // После запуска поток состояния покажет код и актуальную ссылку в панели.
        try {
            window.open('https://auth.openai.com/codex/device', '_blank', 'noopener,noreferrer');
        } catch {
            // Блокировка внешней вкладки не должна отменять OAuth.
        }
        // Не блокируем UI на завершении OAuth: host remote может ждать callback
        // браузера. Периодически читаем snapshot, чтобы показать device code сразу.
        void codex.startLogin().catch(error => console.error('[dsh-openai-codex] login failed', error));
        for (let attempt = 0; attempt < 20; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
            await codex.refresh();
            const currentSnapshot = controller.getSnapshot().snapshot;
            if (currentSnapshot?.deviceCode || currentSnapshot?.status === 'done' || currentSnapshot?.status === 'error') break;
        }
    };

    const updateModel = (id: string, patch: Partial<ModelChoice>): void => {
        setDraft(current => current.map(model => (model.id === id ? { ...model, ...patch } : model)));
    };

    const reorderModel = (id: string, direction: 'up' | 'down'): void => {
        setDraft(current => moveModel(current, id, direction));
    };

    const copyDeviceCode = async (code: string): Promise<void> => {
        try {
            if (!navigator.clipboard?.writeText) {
                setCopyStatus(text('copyFailed'));
                return;
            }
            await navigator.clipboard.writeText(code);
            setCopyStatus(text('copied'));
        } catch {
            setCopyStatus(text('copyFailed'));
        }
    };

    const saveModels = async (): Promise<void> => {
        setActionError(undefined);
        if (draft.every(model => !model.enabled)) {
            setActionError(text('modelHint'));
            return;
        }
        try {
            await codex.saveModels(draft);
            setEditOpen(false);
            setActionError(undefined);
        } catch {
            setActionError(text('modelsSaveError'));
        }
    };

    const runAction = async (action: () => Promise<void>): Promise<void> => {
        setActionError(undefined);
        try {
            await action();
        } catch {
            setActionError(text('loginFailed'));
        }
    };

    const selectResetCard = (creditId: string): void => {
        if (pendingReset && pendingReset.creditId !== creditId) return;
        setActionError(undefined);
        setResetCard(creditId);
    };

    const retryPendingReset = (): void => {
        if (pendingReset) selectResetCard(pendingReset.creditId);
    };

    const confirmReset = async (): Promise<void> => {
        if (!resetCard || (pendingReset && pendingReset.creditId !== resetCard)) return;
        setActionError(undefined);
        const request: ResetRequest = pendingReset ?? {
            creditId: resetCard,
            idempotencyKey: crypto.randomUUID(),
            confirmed: true
        };
        savePendingReset(request);
        setPendingReset(request);
        try {
            const result = await codex.consumeReset(request);
            if (result.resetResult !== 'unknown' && result.resetResult !== 'pending' && result.resetResult !== 'account_changed') {
                clearPendingReset();
                setPendingReset(undefined);
            }
            setResetCard(undefined);
        } catch {
            setActionError(text('resetError'));
        }
    };

    const proxyOptions: readonly SelectOption<'host' | 'system'>[] = [
        { value: 'host', label: text('hostProxy') },
        { value: 'system', label: text('systemProxy') }
    ];

    return {
        codex,
        snapshot,
        editOpen,
        draft,
        resetCard,
        pendingReset,
        actionError,
        copyStatus,
        proxyOptions,
        beginEdit,
        startLogin,
        closeEdit: () => {
            setActionError(undefined);
            setEditOpen(false);
        },
        updateModel,
        reorderModel,
        saveModels,
        copyDeviceCode,
        runAction,
        selectResetCard,
        retryPendingReset,
        closeReset: () => {
            setActionError(undefined);
            setResetCard(undefined);
        },
        confirmReset
    };
}
