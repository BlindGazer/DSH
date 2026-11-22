import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import type { AuthMethod } from '../../../../shared/accounts.ts';
import { AccountLabelSchema } from '../../../../shared/accounts.ts';
import type { OpenAICodexText } from '../../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import type { AccountSnapshot } from '../../../../shared/remote.ts';
import type { OpenAICodexController } from '../openAICodexRuntime.ts';
export function useCodexSettingsPanel(
    controller: OpenAICodexController,
    text: (key: OpenAICodexText) => string,
    reauthenticateAccount?: Pick<AccountSnapshot, 'accountLabel' | 'authMethod'>,
    onReauthenticationClose?: () => void
) {
    const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    const snapshot = state.snapshot;
    const [addLoginOpen, setAddLoginOpen] = useState(false),
        [label, setLabel] = useState(''),
        [authMethod, setAuthMethod] = useState<AuthMethod>('device-code'),
        [error, setError] = useState(''),
        [busy, setBusy] = useState(false),
        [callbackInFlight, setCallbackInFlight] = useState(false),
        [loginStarted, setLoginStarted] = useState(false),
        [loginPending, setLoginPending] = useState(false),
        [callbackUrl, setCallbackUrl] = useState(''),
        [copyFeedback, setCopyFeedback] = useState('');
    const isReauthentication = Boolean(reauthenticateAccount);
    const loginOpen = addLoginOpen || isReauthentication;
    const activeLabel = reauthenticateAccount?.accountLabel ?? label;
    const activeAuthMethod = reauthenticateAccount?.authMethod ?? authMethod;
    const labelId = useId();
    const copyVerificationLink = async () => {
        const verificationUri = snapshot?.verificationUri;
        if (!verificationUri) return;
        try {
            await navigator.clipboard.writeText(verificationUri);
            setCopyFeedback(text('verificationLinkCopied'));
        } catch {
            setCopyFeedback(text('verificationLinkCopyFailed'));
        }
    };
    useEffect(() => {
        if (state.status === 'loading') void controller.load();
    }, [controller, state.status]);
    useEffect(() => {
        if (!loginOpen || !loginPending) return undefined;
        let active = true;
        const poll = async () => {
            await controller.load(true);
            if (!active) return;
            const current = controller.getSnapshot().snapshot;
            if (current?.status === 'done') {
                setLoginPending(false);
                setLoginStarted(false);
                setCallbackUrl('');
                setLabel('');
                setAddLoginOpen(false);
                if (isReauthentication) onReauthenticationClose?.();
            } else if (current?.status === 'error') {
                setLoginPending(false);
                setError(current.error || text('loginFailed'));
            }
        };
        const timer = window.setInterval(() => void poll(), 1000);
        void poll();
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [controller, isReauthentication, loginOpen, loginPending, onReauthenticationClose, text]);
    useEffect(() => {
        if (!loginOpen || !loginPending || (snapshot?.status !== 'done' && snapshot?.status !== 'error')) return;
        const timer = window.setTimeout(() => {
            if (snapshot.status === 'done') {
                setLoginPending(false);
                setLoginStarted(false);
                setCallbackUrl('');
                setLabel('');
                setAddLoginOpen(false);
                if (isReauthentication) onReauthenticationClose?.();
            } else {
                setLoginPending(false);
                setError(snapshot.error || text('loginFailed'));
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [isReauthentication, loginOpen, loginPending, onReauthenticationClose, snapshot, text]);
    const openLogin = () => {
        const pending = snapshot?.status === 'starting' || snapshot?.status === 'waiting';
        setLoginPending(pending);
        setLoginStarted(pending);
        setCallbackUrl('');
        setCopyFeedback('');
        setError('');
        if (isReauthentication) onReauthenticationClose?.();
        setAddLoginOpen(true);
    };
    const closeLogin = () => {
        if (loginStarted || loginPending || snapshot?.status === 'starting' || snapshot?.status === 'waiting' || snapshot?.retryAvailable)
            void controller.cancelLogin().catch(() => undefined);
        setAddLoginOpen(false);
        setLoginStarted(false);
        setLoginPending(false);
        setCallbackInFlight(false);
        if (isReauthentication) onReauthenticationClose?.();
        setCallbackUrl('');
    };
    const submitCallbackUrl = async () => {
        const url = callbackUrl.trim();
        if (!url) {
            setError(text('callbackFailed'));
            return;
        }
        setBusy(true);
        setCallbackInFlight(true);
        setError('');
        try {
            const result = await controller.submitCallbackUrl(url);
            setCallbackUrl('');
            if (result.status === 'done') {
                setLoginPending(false);
                setLoginStarted(false);
                setLabel('');
                closeLogin();
            } else if (result.status === 'error') {
                setLoginPending(false);
                setError(result.error || text('callbackFailed'));
            } else {
                setLoginPending(true);
            }
        } catch {
            setError(text('callbackFailed'));
        } finally {
            setCallbackInFlight(false);
            setBusy(false);
        }
    };
    const retryLogin = async () => {
        setBusy(true);
        setError('');
        try {
            const result = await controller.retryLogin();
            if (result.status === 'starting') {
                setLoginStarted(true);
                setLoginPending(true);
            }
        } catch {
            setError(text('loginFailed'));
        } finally {
            setBusy(false);
        }
    };
    const startLogin = async () => {
        const parsed = AccountLabelSchema.safeParse(activeLabel);
        if (!parsed.success || (!isReauthentication && snapshot?.accounts.some(account => account.accountLabel === activeLabel))) {
            setError(text('labelInvalid'));
            return;
        }
        setBusy(true);
        setError('');
        setLoginStarted(true);
        try {
            const result = await controller.startLogin(parsed.data, activeAuthMethod, isReauthentication);
            if (result.status === 'done') {
                setLabel('');
                setCallbackUrl('');
                setLoginPending(false);
                closeLogin();
            } else if (result.status === 'waiting' || result.status === 'starting') setLoginPending(true);
            if (result.status === 'error') setError(result.error || text('loginFailed'));
        } catch {
            setError(text('loginFailed'));
        } finally {
            setBusy(false);
        }
    };
    return {
        state,
        snapshot,
        loginOpen,
        label: activeLabel,
        authMethod: activeAuthMethod,
        error,
        busy,
        signingIn: (callbackInFlight || snapshot?.status === 'starting') && snapshot?.status !== 'error' && snapshot?.status !== 'done',
        loginStarted,
        isReauthentication,
        labelId,
        callbackUrl,
        setCallbackUrl,
        copyFeedback,
        copyVerificationLink,
        closeLogin,
        openLogin,
        setLabel,
        setAuthMethod,
        startLogin,
        submitCallbackUrl,
        retryLogin
    };
}
