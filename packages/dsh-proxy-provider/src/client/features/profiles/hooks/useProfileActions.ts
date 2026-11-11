import { useCallback, useState } from 'react';
import { DEFAULT_TEST_URL } from '../../../../shared/constants/endpoints.js';
import type {
    DiscoveredProvider,
    HostConflict,
    ProfileDraft,
    SanitizedProxyProfile,
    TestConnectionResult
} from '../../../../shared/models/ProxyModels.js';
import { createEmptyDraft, draftFromProfile, profileFromDraft } from '../../../../shared/utils/hostUtils.js';
import { type ProxyClientSnapshot, proxyStore } from '../../../app/proxyStore.js';

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
export function useProfileActions(snap: ProxyClientSnapshot): ProfileActionsState {
    const [editingDraft, setEditingDraft] = useState<ProfileDraft | null>(null);
    const [isNewDraft, setIsNewDraft] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [testUrl, setTestUrl] = useState(snap.config?.defaultTestUrl || DEFAULT_TEST_URL);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<DeleteConfirmState | null>(null);
    const [saving, setSaving] = useState(false);

    const profiles = snap.config?.profiles || [];
    const bindings = snap.config?.providerBindings || {};
    const providers = snap.providers || [];
    const conflicts = snap.conflicts || [];

    const resetForOpen = useCallback((): void => {
        setFormError(null);
        setTestResult(null);
    }, []);

    const startAddProfile = (): void => {
        setEditingDraft(createEmptyDraft());
        setIsNewDraft(true);
        setShowPassword(false);
        setFormError(null);
        setTestResult(null);
    };

    const startEditProfile = (profile: SanitizedProxyProfile): void => {
        setEditingDraft(draftFromProfile(profile));
        setIsNewDraft(false);
        setShowPassword(false);
        setFormError(null);
        setTestResult(null);
    };

    const cancelEditProfile = (): void => {
        setEditingDraft(null);
        setFormError(null);
        setTestResult(null);
    };

    const handleSaveDraft = async (): Promise<void> => {
        if (!editingDraft) return;
        const candidate = profileFromDraft(editingDraft);
        if (!candidate.name) {
            setFormError('Profile Name is required.');
            return;
        }
        if (!candidate.host) {
            setFormError('Valid proxy Host (IP or domain without scheme) is required.');
            return;
        }
        if (!Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535) {
            setFormError('Port must be an integer between 1 and 65535.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const nextProfiles = isNewDraft
                ? [...profiles, candidate]
                : profiles.map(profile => (profile.id === candidate.id ? candidate : profile));
            await proxyStore.saveConfig({
                ...snap.config,
                profiles: nextProfiles,
                defaultTestUrl: testUrl || DEFAULT_TEST_URL
            });
            setEditingDraft(null);
            setTestResult(null);
        } catch (err) {
            const errorObj = err as { message?: string };
            setFormError(errorObj?.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const performDeleteProfile = async (profileId: string): Promise<void> => {
        setSaving(true);
        try {
            const nextProfiles = profiles.filter(profile => profile.id !== profileId);
            const nextBindings: Record<string, string | null> = { ...bindings };
            for (const [providerId, boundProfileId] of Object.entries(nextBindings)) {
                if (boundProfileId === profileId) nextBindings[providerId] = null;
            }
            await proxyStore.saveConfig({
                ...snap.config,
                profiles: nextProfiles,
                providerBindings: nextBindings
            });
            setDeleteConfirmProfile(null);
            if (editingDraft?.id === profileId) setEditingDraft(null);
        } catch (err) {
            const errorObj = err as { message?: string };
            setFormError(errorObj?.message || 'Failed to delete profile');
        } finally {
            setSaving(false);
        }
    };

    const requestDeleteProfile = (profile: SanitizedProxyProfile): void => {
        const affectedProviders = Object.entries(bindings)
            .filter(([, profileId]) => profileId === profile.id)
            .map(([providerId]) => providers.find(provider => provider.id === providerId)?.name || providerId);
        if (affectedProviders.length > 0) {
            setDeleteConfirmProfile({ profile, affectedProviders });
        } else {
            performDeleteProfile(profile.id).catch(() => {});
        }
    };

    const handleRunTest = async (): Promise<void> => {
        if (!editingDraft) return;
        const candidate = profileFromDraft(editingDraft);
        if (!candidate.host || !Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535) {
            setTestResult({
                ok: false,
                tcpOk: false,
                httpOk: false,
                error: 'Please enter a valid Host and Port (1–65535) before testing.'
            });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            setTestResult(await proxyStore.testConnection(candidate, testUrl));
        } catch (err) {
            const errorObj = err as { message?: string };
            setTestResult({
                ok: false,
                tcpOk: false,
                httpOk: false,
                error: errorObj?.message || 'Connection test request failed'
            });
        } finally {
            setTesting(false);
        }
    };

    return {
        profiles,
        bindings,
        providers,
        conflicts,
        editingDraft,
        setEditingDraft,
        isNewDraft,
        showPassword,
        setShowPassword,
        testUrl,
        setTestUrl,
        testing,
        testResult,
        formError,
        deleteConfirmProfile,
        setDeleteConfirmProfile,
        saving,
        resetForOpen,
        startAddProfile,
        startEditProfile,
        cancelEditProfile,
        handleSaveDraft,
        performDeleteProfile,
        requestDeleteProfile,
        handleRunTest
    };
}
