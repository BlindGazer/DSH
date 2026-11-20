import { useId, useState } from 'react';
import { AccountLabelSchema } from '../../../../shared/accounts.js';
import type { OpenAICodexText } from '../../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type { AccountSnapshot, ModelChoice, OpenAICodexSnapshot, ResetRequest } from '../../../../shared/remote.js';
import type { OpenAICodexController } from '../openAICodexRuntime.js';
import { useCodexAccountPolling } from './useCodexAccountPolling.js';

const RESET_PREFIX = '@kalex/dsh-openai-hub.pending-reset';
const resetCreditKey = (label: string) => `${RESET_PREFIX}-credit:${label}`;
const resetRequestKey = (label: string) => `${RESET_PREFIX}-request:${label}`;
function readPendingReset(accountLabel: string): ResetRequest | undefined {
    try {
        const creditId = window.sessionStorage.getItem(resetCreditKey(accountLabel));
        const idempotencyKey = window.sessionStorage.getItem(resetRequestKey(accountLabel));
        if (
            !creditId ||
            !idempotencyKey ||
            !/^[A-Za-z0-9_-]{1,200}$/.test(creditId) ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)
        )
            return undefined;
        return { accountLabel, creditId, idempotencyKey, confirmed: true };
    } catch {
        return undefined;
    }
}
function savePendingReset(request: ResetRequest): void {
    try {
        window.sessionStorage.setItem(resetCreditKey(request.accountLabel), request.creditId);
        window.sessionStorage.setItem(resetRequestKey(request.accountLabel), request.idempotencyKey);
    } catch {
        /* Storage may be unavailable. */
    }
}
function clearPendingReset(accountLabel: string): void {
    try {
        window.sessionStorage.removeItem(resetCreditKey(accountLabel));
        window.sessionStorage.removeItem(resetRequestKey(accountLabel));
    } catch {
        /* Storage may be unavailable. */
    }
}
function clearPendingResetForLastAccount(): void {
    try {
        for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
            const key = window.sessionStorage.key(index);
            if (key?.startsWith(RESET_PREFIX)) window.sessionStorage.removeItem(key);
        }
    } catch {
        /* Storage may be unavailable. */
    }
}
export interface UseCodexAccountCardResult {
    readonly labelId: string;
    readonly modelModalOpen: boolean;
    readonly deleteModalOpen: boolean;
    readonly editingLabel: boolean;
    readonly label: string;
    readonly draft: readonly ModelChoice[];
    readonly error: string;
    readonly busy: boolean;
    readonly resetCard: string;
    readonly pendingReset: ResetRequest | undefined;
    readonly resetResult: string;
    setLabel(value: string): void;
    setModelModalOpen(value: boolean): void;
    setDeleteModalOpen(value: boolean): void;
    setEditingLabel(value: boolean): void;
    setResetCard(value: string): void;
    updateModel(index: number, patch: Partial<ModelChoice>): void;
    moveModel(fromIndex: number, toIndex: number): void;
    saveLabel(): Promise<void>;
    setAutoRefresh(value: boolean): void;
    run(action: () => Promise<OpenAICodexSnapshot>): Promise<boolean>;
    openModels(): void;
    saveModels(): Promise<void>;
    confirmReset(): Promise<void>;
    deleteAccount(): Promise<void>;
    refreshCatalog(): Promise<boolean>;
    refreshUsage(): Promise<boolean>;
}
export function useCodexAccountCard(
    account: AccountSnapshot,
    controller: OpenAICodexController,
    text: (key: OpenAICodexText) => string
): UseCodexAccountCardResult {
    const labelId = useId();
    const [modelModalOpen, setModelModalOpen] = useState(false),
        [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [editingLabel, setEditingLabel] = useState(false),
        [label, setLabel] = useState(account.accountLabel);
    const [draft, setDraft] = useState<ModelChoice[]>(account.models.map(model => ({ ...model })));
    const [error, setError] = useState(''),
        [busy, setBusy] = useState(false),
        [resetCard, setResetCard] = useState('');
    const [pendingReset, setPendingReset] = useState<ResetRequest | undefined>(() => readPendingReset(account.accountLabel));
    useCodexAccountPolling(account, controller);
    const run = async (action: () => Promise<OpenAICodexSnapshot>): Promise<boolean> => {
        setBusy(true);
        setError('');
        try {
            await action();
            return true;
        } catch {
            setError(text('actionFailed'));
            return false;
        } finally {
            setBusy(false);
        }
    };
    const saveLabel = async () => {
        const checked = AccountLabelSchema.safeParse(label);
        if (!checked.success) {
            setError(text('labelInvalid'));
            return;
        }
        if (
            await run(() =>
                controller.updateAccount(account.accountLabel, checked.data, account.autoRefreshLimits, result => {
                    if (
                        checked.data === account.accountLabel ||
                        !result.accounts.some(candidate => candidate.accountLabel === checked.data)
                    )
                        return;
                    // Host подтвердил переименование того же credential; переносим retry до монтирования карточки с новой меткой.
                    clearPendingReset(checked.data);
                    if (pendingReset) savePendingReset({ ...pendingReset, accountLabel: checked.data });
                    clearPendingReset(account.accountLabel);
                })
            )
        )
            setEditingLabel(false);
    };
    const setAutoRefresh = (value: boolean) => {
        void run(() => controller.updateAccount(account.accountLabel, account.accountLabel, value));
    };
    const refreshCatalog = () => run(() => controller.refreshCatalog(account.accountLabel));
    const refreshUsage = () => run(() => controller.refreshUsage(account.accountLabel));
    const openModels = () => {
        setError('');
        setDraft(account.models.map(model => ({ ...model })));
        setModelModalOpen(true);
    };
    const updateModel = (index: number, patch: Partial<ModelChoice>) =>
        setDraft(rows => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    const moveModel = (fromIndex: number, toIndex: number) =>
        setDraft(rows => {
            if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= rows.length || fromIndex === toIndex) return rows;
            const next = [...rows];
            const [model] = next.splice(fromIndex, 1);
            if (!model) return rows;
            next.splice(toIndex, 0, model);
            return next;
        });
    const saveModels = async () => {
        if (draft.some(model => model.enabled) && (await run(() => controller.saveModels(account.accountLabel, draft))))
            setModelModalOpen(false);
    };
    const confirmReset = async () => {
        if (!resetCard || (pendingReset && pendingReset.creditId !== resetCard)) return;
        const request: ResetRequest = pendingReset ?? {
            accountLabel: account.accountLabel,
            creditId: resetCard,
            idempotencyKey: crypto.randomUUID(),
            confirmed: true
        };
        savePendingReset(request);
        setPendingReset(request);
        setBusy(true);
        setError('');
        try {
            const resultSnapshot = await controller.consumeReset(request);
            const result = resultSnapshot.accounts.find(candidate => candidate.accountLabel === account.accountLabel)?.resetResult;
            if (result && result !== 'unknown' && result !== 'pending' && result !== 'account_changed') {
                clearPendingReset(account.accountLabel);
                setPendingReset(undefined);
            }
            setResetCard('');
        } catch {
            setError(text('resetError'));
        } finally {
            setBusy(false);
        }
    };
    const deleteAccount = async () => {
        if (!(await run(() => controller.deleteAccount(account.accountLabel)))) return;
        clearPendingReset(account.accountLabel);
        if ((controller.getSnapshot().snapshot?.accounts.length ?? 0) === 0) clearPendingResetForLastAccount();
        setDeleteModalOpen(false);
    };
    const resetResult = (() => {
        switch (account.resetResult) {
            case 'reset':
                return text('resetSuccess');
            case 'already_redeemed':
                return text('resetAlreadyUsed');
            case 'no_credit':
                return text('resetNoCredit');
            case 'nothing_to_reset':
                return text('resetNothing');
            case 'unknown':
            case 'pending':
                return text('resetPending');
            case 'account_changed':
                return text('resetAccountChanged');
            case 'unavailable':
                return text('resetUnavailable');
            default:
                return '';
        }
    })();
    return {
        labelId,
        modelModalOpen,
        deleteModalOpen,
        editingLabel,
        label,
        draft,
        error,
        busy,
        resetCard,
        pendingReset,
        resetResult,
        setLabel,
        setModelModalOpen,
        setDeleteModalOpen,
        setEditingLabel,
        setResetCard,
        updateModel,
        moveModel,
        saveLabel,
        setAutoRefresh,
        run,
        openModels,
        saveModels,
        confirmReset,
        deleteAccount,
        refreshCatalog,
        refreshUsage
    };
}
