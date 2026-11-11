import type { ProfileDraft } from '../../../../shared/models/ProxyModels.js';
export interface IoNotice {
    readonly ok: boolean;
    readonly text: string;
}
export interface ImportedPayloadCandidate {
    readonly encryptedCredentials?: boolean;
    readonly profiles?: ReadonlyArray<{
        readonly auth?: {
            readonly exportCipher?: string;
        };
    }>;
    readonly config?: {
        readonly profiles?: ReadonlyArray<{
            readonly auth?: {
                readonly exportCipher?: string;
            };
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
    readonly fileInputRef: {
        current: HTMLInputElement | null;
    };
    readonly resetForOpen: () => void;
    readonly handleExportClick: () => Promise<void>;
    readonly handleConfirmEncryptedExport: () => Promise<void>;
    readonly handleImportFileChange: (event: {
        target?: {
            files?: ArrayLike<File> | null;
            value?: string;
        };
    }) => Promise<void>;
    readonly handleConfirmEncryptedImport: (skipCredentials?: boolean) => Promise<void>;
}
/**
 * Хук управления экспортом и импортом профилей прокси (включая парольное шифрование AES-256-GCM).
 */
export declare function useImportExportHandlers(options: {
    readonly setEditingDraft: (draft: ProfileDraft | null) => void;
}): ImportExportHandlersState;
