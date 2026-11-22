import { useCallback, useEffect, useState } from 'react';
import type { AccountSnapshot } from '../../../../shared/remote.ts';
import type { OpenAICodexController } from '../openAICodexRuntime.ts';
import { useCodexState } from '../openAICodexRuntime.ts';
export function useCodexModelsFooterEntry(controller: OpenAICodexController) {
    const [openAccountLabel, setOpenAccountLabel] = useState('');
    const [autoRefreshPendingLabel, setAutoRefreshPendingLabel] = useState('');
    const [autoRefreshErrorLabel, setAutoRefreshErrorLabel] = useState('');
    const [accountActionPendingLabel, setAccountActionPendingLabel] = useState('');
    const [accountActionErrorLabel, setAccountActionErrorLabel] = useState('');
    const [deleteConfirmLabel, setDeleteConfirmLabel] = useState('');
    const [reauthenticateAccount, setReauthenticateAccount] = useState<Pick<AccountSnapshot, 'accountLabel' | 'authMethod'> | undefined>();
    const clearReauthenticate = useCallback(() => setReauthenticateAccount(undefined), []);
    const state = useCodexState(controller);
    const initializing =
        state.snapshot?.status === 'waiting' ||
        state.snapshot?.status === 'starting' ||
        state.snapshot?.accounts.some(account => account.catalogStatus === 'fallback') === true;
    const accounts: readonly AccountSnapshot[] = state.snapshot?.accounts ?? [];
    const shouldPoll = initializing || accounts.some(account => account.autoRefreshLimits);
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') void controller.load(true);
        };
        refresh();
        if (!shouldPoll) return undefined;
        const timer = window.setInterval(refresh, initializing ? 2500 : 300000);
        const visibility = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        document.addEventListener('visibilitychange', visibility);
        return () => {
            if (timer !== undefined) window.clearInterval(timer);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, [controller, initializing, shouldPoll]);
    const reauthenticate = (account: AccountSnapshot) =>
        setReauthenticateAccount({ accountLabel: account.accountLabel, authMethod: account.authMethod });
    const requestDeleteAccount = (accountLabel: string) => {
        setAccountActionErrorLabel('');
        setDeleteConfirmLabel(accountLabel);
    };
    const cancelDeleteAccount = () => {
        if (!accountActionPendingLabel) setDeleteConfirmLabel('');
    };
    const confirmDeleteAccount = async (accountLabel: string) => {
        if (deleteConfirmLabel !== accountLabel) return;
        setAccountActionPendingLabel(accountLabel);
        setAccountActionErrorLabel('');
        try {
            await controller.deleteAccount(accountLabel);
            if (reauthenticateAccount?.accountLabel === accountLabel) setReauthenticateAccount(undefined);
            setDeleteConfirmLabel('');
        } catch {
            setAccountActionErrorLabel(accountLabel);
        } finally {
            setAccountActionPendingLabel('');
        }
    };
    const setAutoRefreshLimits = async (accountLabel: string, enabled: boolean) => {
        setAutoRefreshPendingLabel(accountLabel);
        setAutoRefreshErrorLabel('');
        try {
            await controller.updateAccount(accountLabel, accountLabel, enabled);
        } catch {
            setAutoRefreshErrorLabel(accountLabel);
        } finally {
            setAutoRefreshPendingLabel('');
        }
    };
    return {
        accounts,
        openAccountLabel,
        setOpenAccountLabel,
        autoRefreshPendingLabel,
        autoRefreshErrorLabel,
        accountActionPendingLabel,
        accountActionErrorLabel,
        deleteConfirmLabel,
        reauthenticateAccount,
        reauthenticate,
        requestDeleteAccount,
        cancelDeleteAccount,
        confirmDeleteAccount,
        clearReauthenticate,
        setAutoRefreshLimits
    };
}
