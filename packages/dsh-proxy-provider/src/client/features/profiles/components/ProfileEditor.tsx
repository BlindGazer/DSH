import { ThemedSelect } from '@kalex/dsh-core';

import { DEFAULT_TEST_URL } from '../../../../shared/constants/endpoints.js';
import type { ProfileDraft, ProxyProtocol, TestConnectionResult } from '../../../../shared/models/ProxyModels.js';
import { sanitizeHostInput } from '../../../../shared/utils/hostUtils.js';
import { tProxy } from '../../../app/proxyStore.js';
import { ProfileCredentialsFields } from './ProfileCredentialsFields.js';

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
export function ProfileEditor({
    editingDraft,
    isNewDraft,
    formError,
    setEditingDraft,
    showPassword,
    setShowPassword,
    testUrl,
    setTestUrl,
    testing,
    handleRunTest,
    testResult,
    cancelEditProfile,
    handleSaveDraft,
    saving
}: ProfileEditorProps) {
    return (
        <div className="kpp-form">
            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                {isNewDraft ? tProxy('Create Proxy Profile') : tProxy(`Edit Profile: ${editingDraft.name}`)}
            </div>
            {formError ? <div className="kpp-alert kpp-alert-err">{tProxy(formError)}</div> : undefined}
            <div className="kpp-grid">
                <label className="kpp-field">
                    <span className="kpp-label">{tProxy('Profile Name')}</span>
                    <input
                        type="text"
                        className="kpp-input"
                        placeholder={tProxy('e.g. Corporate Proxy')}
                        value={editingDraft.name}
                        onChange={e => setEditingDraft({ ...editingDraft, name: e.target.value })}
                    />
                </label>
                <div className="kpp-field">
                    <span className="kpp-label">{tProxy('Protocol')}</span>
                    <ThemedSelect<ProxyProtocol>
                        ariaLabel={tProxy('Protocol')}
                        fullWidth={true}
                        value={editingDraft.protocol}
                        options={[
                            { value: 'http', label: 'HTTP' },
                            { value: 'https', label: 'HTTPS' },
                            { value: 'socks5', label: 'SOCKS5' }
                        ]}
                        onChange={nextProto => setEditingDraft({ ...editingDraft, protocol: nextProto })}
                        showCheckmark={true}
                    />
                </div>
                <label className="kpp-field">
                    <span className="kpp-label">{tProxy('Port (1–65535)')}</span>
                    <input
                        type="number"
                        min={1}
                        max={65535}
                        className="kpp-input"
                        placeholder="8080"
                        value={editingDraft.port}
                        onChange={e => setEditingDraft({ ...editingDraft, port: e.target.value })}
                    />
                </label>
            </div>
            <label className="kpp-field">
                <span className="kpp-label">{tProxy('Host (IP or domain, scheme stripped automatically)')}</span>
                <input
                    type="text"
                    className="kpp-input"
                    placeholder={tProxy('proxy.corp.local or 127.0.0.1')}
                    value={editingDraft.host}
                    onChange={e =>
                        setEditingDraft({
                            ...editingDraft,
                            host: sanitizeHostInput(e.target.value)
                        })
                    }
                />
            </label>
            <label className="kpp-checkbox-row">
                <input
                    type="checkbox"
                    checked={editingDraft.authEnabled}
                    onChange={e =>
                        setEditingDraft({
                            ...editingDraft,
                            authEnabled: e.target.checked
                        })
                    }
                />
                <span>{tProxy('Requires authentication (Basic / SOCKS5 Username & Password)')}</span>
            </label>
            {editingDraft.authEnabled ? (
                <ProfileCredentialsFields
                    editingDraft={editingDraft}
                    setEditingDraft={setEditingDraft}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                />
            ) : undefined}
            <label className="kpp-checkbox-row">
                <input
                    type="checkbox"
                    checked={editingDraft.ignoreSslErrors}
                    onChange={e =>
                        setEditingDraft({
                            ...editingDraft,
                            ignoreSslErrors: e.target.checked
                        })
                    }
                />
                <span>{tProxy('Ignore SSL / TLS certificate errors (rejectUnauthorized: false)')}</span>
            </label>
            <div
                style={{
                    paddingTop: '8px',
                    borderTop: '1px solid var(--dsh-ui-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                <span className="kpp-label">{tProxy('Test Connection (5000ms TCP + HTTP check)')}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        className="kpp-input"
                        placeholder={DEFAULT_TEST_URL}
                        value={testUrl}
                        onChange={e => setTestUrl(e.target.value)}
                    />
                    <button
                        type="button"
                        className="kpp-btn"
                        disabled={testing}
                        onClick={() => {
                            handleRunTest().catch(() => {});
                        }}>
                        {tProxy(testing ? 'Testing...' : 'Test')}
                    </button>
                </div>
                {testResult ? (
                    <div className={testResult.ok ? 'kpp-alert kpp-alert-ok' : 'kpp-alert kpp-alert-err'}>
                        {tProxy(
                            testResult.ok
                                ? `✓ Proxy reachable! TCP OK (${testResult.tcpLatencyMs ?? 0}ms) • Target HTTP ${
                                      testResult.status ?? 'OK'
                                  } (${testResult.latencyMs ?? 0}ms)`
                                : `✕ ${testResult.error || 'Connection test failed'}${
                                      testResult.tcpOk ? ` (TCP connected in ${testResult.tcpLatencyMs ?? 0}ms, HTTP stage failed)` : ''
                                  }`
                        )}
                    </div>
                ) : undefined}
            </div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginTop: '4px'
                }}>
                <button type="button" className="kpp-btn" onClick={cancelEditProfile}>
                    {tProxy('Cancel')}
                </button>
                <button
                    type="button"
                    className="kpp-btn kpp-btn-primary"
                    disabled={saving}
                    onClick={() => {
                        handleSaveDraft().catch(() => {});
                    }}>
                    {tProxy(saving ? 'Saving...' : 'Save Profile')}
                </button>
            </div>
        </div>
    );
}
