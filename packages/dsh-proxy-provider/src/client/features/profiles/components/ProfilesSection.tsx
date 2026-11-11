import { tProxy } from '../../../app/proxyStore.js';

import type { ProfileActionsState } from '../hooks/useProfileActions.js';
import { ProfileEditor } from './ProfileEditor.js';

interface ProfilesSectionProps extends Omit<ProfileActionsState, 'resetForOpen'> {}

/**
 * Секция списка профилей прокси с подтверждением удаления и встроенным редактором.
 */
export function ProfilesSection(props: ProfilesSectionProps) {
    const {
        profiles,
        editingDraft,
        isNewDraft,
        startAddProfile,
        deleteConfirmProfile,
        saving,
        performDeleteProfile,
        setDeleteConfirmProfile,
        startEditProfile,
        requestDeleteProfile,
        formError,
        showPassword,
        setEditingDraft,
        setShowPassword,
        testUrl,
        setTestUrl,
        testing,
        handleRunTest,
        testResult,
        cancelEditProfile,
        handleSaveDraft
    } = props;

    return (
        <div className="kpp-section">
            <div className="kpp-section-head">
                <h3 className="kpp-section-title">{tProxy('1. Proxy Profiles')}</h3>
                {!editingDraft ? (
                    <button type="button" className="kpp-btn kpp-btn-primary kpp-btn-sm" onClick={startAddProfile}>
                        {tProxy('+ Add Profile')}
                    </button>
                ) : undefined}
            </div>

            {deleteConfirmProfile ? (
                <div className="kpp-alert kpp-alert-warn">
                    <div>
                        {tProxy(
                            `Profile "${deleteConfirmProfile.profile.name}" is currently assigned to: ${deleteConfirmProfile.affectedProviders.join(', ')}. Deleting it will reset those providers to Direct (No proxy).`
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                            type="button"
                            className="kpp-btn kpp-btn-danger kpp-btn-sm"
                            disabled={saving}
                            onClick={() => {
                                performDeleteProfile(deleteConfirmProfile.profile.id).catch(() => {});
                            }}>
                            {tProxy('Confirm Delete & Reset to Direct')}
                        </button>
                        <button type="button" className="kpp-btn kpp-btn-sm" onClick={() => setDeleteConfirmProfile(null)}>
                            {tProxy('Cancel')}
                        </button>
                    </div>
                </div>
            ) : undefined}

            {profiles.length === 0 && !editingDraft ? (
                <div className="kpp-host-sub">
                    {tProxy('No proxy profiles created yet. Click "+ Add Profile" to configure HTTP, HTTPS, or SOCKS5 proxy.')}
                </div>
            ) : (
                <div className="kpp-list">
                    {profiles.map(p => (
                        <div key={p.id} className="kpp-row">
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                                <div className="kpp-host-sub">
                                    {`${p.protocol.toUpperCase()}://${p.host}:${p.port}${
                                        p.auth?.enabled ? ` • Auth (${p.auth.usernameMask || 'encrypted'})` : ''
                                    }${p.ignoreSslErrors ? ' • Ignore SSL Errors' : ''}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" className="kpp-btn kpp-btn-sm" onClick={() => startEditProfile(p)}>
                                    {tProxy('Edit')}
                                </button>
                                <button type="button" className="kpp-btn kpp-btn-danger kpp-btn-sm" onClick={() => requestDeleteProfile(p)}>
                                    {tProxy('Delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingDraft ? (
                <ProfileEditor
                    editingDraft={editingDraft}
                    isNewDraft={isNewDraft}
                    formError={formError}
                    setEditingDraft={d => setEditingDraft(d)}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    testUrl={testUrl}
                    setTestUrl={setTestUrl}
                    testing={testing}
                    handleRunTest={handleRunTest}
                    testResult={testResult}
                    cancelEditProfile={cancelEditProfile}
                    handleSaveDraft={handleSaveDraft}
                    saving={saving}
                />
            ) : undefined}
        </div>
    );
}
