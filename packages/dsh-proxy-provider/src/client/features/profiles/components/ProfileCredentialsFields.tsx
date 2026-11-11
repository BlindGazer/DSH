import type { ProfileDraft } from '../../../../shared/models/ProxyModels.js';

import { tProxy } from '../../../app/proxyStore.js';

export interface ProfileCredentialsFieldsProps {
    readonly editingDraft: ProfileDraft;
    readonly setEditingDraft: (next: ProfileDraft) => void;
    readonly showPassword: boolean;
    readonly setShowPassword: (next: boolean) => void;
}

/**
 * Поля ввода имени пользователя и пароля для профиля прокси с поддержкой скрытия/отображения.
 */
export function ProfileCredentialsFields({ editingDraft, setEditingDraft, showPassword, setShowPassword }: ProfileCredentialsFieldsProps) {
    return (
        <div className="kpp-grid-2">
            <label className="kpp-field">
                <span className="kpp-label">
                    {editingDraft.hasCredentials ? tProxy(`Username (saved: ${editingDraft.usernameMask || 'yes'})`) : tProxy('Username')}
                </span>
                <input
                    type="text"
                    className="kpp-input"
                    placeholder={tProxy(editingDraft.hasCredentials ? 'Leave blank to keep saved username' : 'Enter username')}
                    value={editingDraft.username}
                    onChange={e =>
                        setEditingDraft({
                            ...editingDraft,
                            username: e.target.value
                        })
                    }
                />
            </label>
            <div className="kpp-field">
                <span className="kpp-label">{tProxy(editingDraft.hasCredentials ? 'Password (saved encrypted)' : 'Password')}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className="kpp-input"
                        placeholder={tProxy(editingDraft.hasCredentials ? 'Leave blank to keep saved password' : 'Enter password')}
                        value={editingDraft.password}
                        onChange={e =>
                            setEditingDraft({
                                ...editingDraft,
                                password: e.target.value
                            })
                        }
                    />
                    <button type="button" className="kpp-btn kpp-btn-sm" onClick={() => setShowPassword(!showPassword)}>
                        {tProxy(showPassword ? 'Hide' : 'Show')}
                    </button>
                </div>
            </div>
        </div>
    );
}
