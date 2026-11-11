import type { ProfileDraft } from '../../../../shared/models/ProxyModels.js';
export interface ProfileCredentialsFieldsProps {
    readonly editingDraft: ProfileDraft;
    readonly setEditingDraft: (next: ProfileDraft) => void;
    readonly showPassword: boolean;
    readonly setShowPassword: (next: boolean) => void;
}
/**
 * Поля ввода имени пользователя и пароля для профиля прокси с поддержкой скрытия/отображения.
 */
export declare function ProfileCredentialsFields({ editingDraft, setEditingDraft, showPassword, setShowPassword }: ProfileCredentialsFieldsProps): import("react").JSX.Element;
