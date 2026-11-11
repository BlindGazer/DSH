import type { ProfileDraft, TestConnectionResult } from '../../../../shared/models/ProxyModels.js';
export interface ProfileEditorProps {
    readonly editingDraft: ProfileDraft;
    readonly isNewDraft: boolean;
    readonly formError: string | null;
    readonly setEditingDraft: (next: ProfileDraft) => void;
    readonly showPassword: boolean;
    readonly setShowPassword: (next: boolean) => void;
    readonly testUrl: string;
    readonly setTestUrl: (next: string) => void;
    readonly testing: boolean;
    readonly handleRunTest: () => Promise<void>;
    readonly testResult: TestConnectionResult | null;
    readonly cancelEditProfile: () => void;
    readonly handleSaveDraft: () => Promise<void>;
    readonly saving: boolean;
}
/**
 * Форма создания и редактирования профиля прокси-сервера с двухэтапной проверкой соединения.
 */
export declare function ProfileEditor({ editingDraft, isNewDraft, formError, setEditingDraft, showPassword, setShowPassword, testUrl, setTestUrl, testing, handleRunTest, testResult, cancelEditProfile, handleSaveDraft, saving }: ProfileEditorProps): import("react").JSX.Element;
