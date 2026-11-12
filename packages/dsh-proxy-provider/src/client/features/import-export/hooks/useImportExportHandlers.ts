import { useCallback, useRef, useState } from 'react';
import type { ProfileDraft } from '../../../../shared/models/ProxyModels.js';
import { proxyStore } from '../../../app/proxyStore.js';

export interface IoNotice {
    readonly ok: boolean;
    readonly text: string;
}

export interface ImportedPayloadCandidate {
    readonly encryptedCredentials?: boolean;
    readonly profiles?: ReadonlyArray<{
        readonly auth?: { readonly exportCipher?: string };
    }>;
    readonly config?: {
        readonly profiles?: ReadonlyArray<{
            readonly auth?: { readonly exportCipher?: string };
        }>;
    };
}

export interface ImportExportHandlersState {
    readonly ioNotice: IoNotice | null;
    readonly exportWithCreds: boolean;
    readonly setExportWithCreds: (next: boolean) => void;
    readonly exportPasswordPromptOpen: boolean;
    readonly setExportPasswordPromptOpen: (next: boolean) => void;
    readonly exportPassword: string;
    readonly setExportPassword: (next: string) => void;
    readonly pendingImportPayload: ImportedPayloadCandidate | null;
    readonly setPendingImportPayload: (next: ImportedPayloadCandidate | null) => void;
    readonly importPassword: string;
    readonly setImportPassword: (next: string) => void;
    readonly fileInputRef: { current: HTMLInputElement | null };
    readonly resetForOpen: () => void;
    readonly handleExportClick: () => Promise<void>;
    readonly handleConfirmEncryptedExport: () => Promise<void>;
    readonly handleImportFileChange: (event: { target?: { files?: ArrayLike<File> | null; value?: string } }) => Promise<void>;
    readonly handleConfirmEncryptedImport: (skipCredentials?: boolean) => Promise<void>;
}

/**
 * Хук управления экспортом и импортом профилей прокси (включая парольное шифрование AES-256-GCM).
 */
export function useImportExportHandlers(options: {
    readonly setEditingDraft: (draft: ProfileDraft | null) => void;
}): ImportExportHandlersState {
    const [ioNotice, setIoNotice] = useState<IoNotice | null>(null);
    const [exportWithCreds, setExportWithCreds] = useState(false);
    const [exportPasswordPromptOpen, setExportPasswordPromptOpen] = useState(false);
    const [exportPassword, setExportPassword] = useState('');
    const [pendingImportPayload, setPendingImportPayload] = useState<ImportedPayloadCandidate | null>(null);
    const [importPassword, setImportPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const resetForOpen = useCallback((): void => {
        setIoNotice(null);
        setExportPasswordPromptOpen(false);
        setExportPassword('');
        setPendingImportPayload(null);
        setImportPassword('');
    }, []);

    const triggerDownloadJson = (exportData: object, withCreds: boolean): void => {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dsh-proxy-provider-settings.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIoNotice({
            ok: true,
            text: withCreds
                ? 'Settings and password-encrypted credentials exported to dsh-proxy-provider-settings.json'
                : 'Proxy settings (without credentials) exported to dsh-proxy-provider-settings.json'
        });
    };

    const handleExportClick = async (): Promise<void> => {
        setIoNotice(null);
        setPendingImportPayload(null);
        if (exportWithCreds) {
            setExportPassword('');
            setExportPasswordPromptOpen(true);
            return;
        }
        try {
            const exportData = await proxyStore.exportConfig({
                includeCredentials: false
            });
            triggerDownloadJson(exportData, false);
        } catch (err) {
            const errorObj = err as { message?: string };
            setIoNotice({
                ok: false,
                text: errorObj?.message || 'Failed to export settings'
            });
        }
    };

    const handleConfirmEncryptedExport = async (): Promise<void> => {
        if (!exportPassword) {
            setIoNotice({
                ok: false,
                text: 'Please enter a password to encrypt credentials.'
            });
            return;
        }
        setIoNotice(null);
        try {
            const exportData = await proxyStore.exportConfig({
                includeCredentials: true,
                password: exportPassword
            });
            setExportPasswordPromptOpen(false);
            setExportPassword('');
            triggerDownloadJson(exportData, true);
        } catch (err) {
            const errorObj = err as { message?: string };
            setIoNotice({
                ok: false,
                text: errorObj?.message || 'Failed to export encrypted settings'
            });
        }
    };

    const handleImportFileChange = async (event: { target?: { files?: ArrayLike<File> | null; value?: string } }): Promise<void> => {
        const file = event.target?.files?.[0];
        if (event.target) event.target.value = '';
        if (!file) return;
        setIoNotice(null);
        setExportPasswordPromptOpen(false);
        try {
            const parsed = JSON.parse(await file.text()) as ImportedPayloadCandidate;
            const candidateProfiles = parsed?.profiles || parsed?.config?.profiles || [];
            const hasEncryptedCreds =
                Boolean(parsed?.encryptedCredentials) ||
                (Array.isArray(candidateProfiles) &&
                    candidateProfiles.some(
                        profile => typeof profile?.auth?.exportCipher === 'string' && profile.auth.exportCipher.length > 0
                    ));

            if (hasEncryptedCreds) {
                setPendingImportPayload(parsed);
                setImportPassword('');
                return;
            }

            await proxyStore.importConfig(parsed);
            options.setEditingDraft(null);
            setIoNotice({
                ok: true,
                text: `Imported ${candidateProfiles.length} profile(s) successfully.`
            });
        } catch (err) {
            const errorObj = err as { message?: string };
            setIoNotice({
                ok: false,
                text: errorObj?.message || 'Invalid JSON file for proxy settings import'
            });
        }
    };

    const handleConfirmEncryptedImport = async (skipCredentials = false): Promise<void> => {
        if (!pendingImportPayload) return;
        if (!skipCredentials && !importPassword) {
            setIoNotice({
                ok: false,
                text: 'Please enter the password to decrypt imported credentials.'
            });
            return;
        }
        setIoNotice(null);
        try {
            await proxyStore.importConfig(pendingImportPayload, {
                password: importPassword,
                skipCredentials
            });
            const count = (pendingImportPayload?.profiles || pendingImportPayload?.config?.profiles || []).length;
            setPendingImportPayload(null);
            setImportPassword('');
            options.setEditingDraft(null);
            setIoNotice({
                ok: true,
                text: skipCredentials
                    ? `Imported ${count} profile(s) without credentials.`
                    : `Imported ${count} profile(s) with decrypted credentials.`
            });
        } catch (err) {
            const errorObj = err as { message?: string };
            setIoNotice({
                ok: false,
                text: errorObj?.message || 'Failed to decrypt and import proxy settings'
            });
        }
    };

    return {
        ioNotice,
        exportWithCreds,
        setExportWithCreds,
        exportPasswordPromptOpen,
        setExportPasswordPromptOpen,
        exportPassword,
        setExportPassword,
        pendingImportPayload,
        setPendingImportPayload,
        importPassword,
        setImportPassword,
        fileInputRef,
        resetForOpen,
        handleExportClick,
        handleConfirmEncryptedExport,
        handleImportFileChange,
        handleConfirmEncryptedImport
    };
}
