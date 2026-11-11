import type { DiscoveredProvider, HostConflict, ProfileDraft, SanitizedProxyProfile, TestConnectionResult } from '../../../../shared/models/ProxyModels.js';
import { type ProxyClientSnapshot } from '../../../app/proxyStore.js';
export interface DeleteConfirmState {
    readonly profile: SanitizedProxyProfile;
    readonly affectedProviders: readonly string[];
}
export interface ProfileActionsState {
    readonly profiles: readonly SanitizedProxyProfile[];
    readonly bindings: Record<string, string | null>;
    readonly providers: readonly DiscoveredProvider[];
    readonly conflicts: readonly HostConflict[];
    readonly editingDraft: ProfileDraft | null;
    readonly setEditingDraft: (next: ProfileDraft | null) => void;
    readonly isNewDraft: boolean;
    readonly showPassword: boolean;
    readonly setShowPassword: (next: boolean) => void;
    readonly testUrl: string;
    readonly setTestUrl: (next: string) => void;
    readonly testing: boolean;
    readonly testResult: TestConnectionResult | null;
    readonly formError: string | null;
    readonly deleteConfirmProfile: DeleteConfirmState | null;
    readonly setDeleteConfirmProfile: (next: DeleteConfirmState | null) => void;
    readonly saving: boolean;
    readonly resetForOpen: () => void;
    readonly startAddProfile: () => void;
    readonly startEditProfile: (profile: SanitizedProxyProfile) => void;
    readonly cancelEditProfile: () => void;
    readonly handleSaveDraft: () => Promise<void>;
    readonly performDeleteProfile: (profileId: string) => Promise<void>;
    readonly requestDeleteProfile: (profile: SanitizedProxyProfile) => void;
    readonly handleRunTest: () => Promise<void>;
}
/**
 * Хук управления списком профилей прокси, валидацией формы и проверкой соединения.
 */
export declare function useProfileActions(snap: ProxyClientSnapshot): ProfileActionsState;
