import type { ProfileDraft } from '../../../../shared/models/ProxyModels.js';

import { tProxy } from '../../../app/proxyStore.js';
import { proxyClasses } from '../../../app/proxyStyles.js';

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
        <div className={proxyClasses('gridTwo')}>
            <label className={proxyClasses('field')}>
                <span className={proxyClasses('label')}>
                    {editingDraft.hasCredentials ? tProxy(`Username (saved: ${editingDraft.usernameMask || 'yes'})`) : tProxy('Username')}
                </span>
                <input
                    type="text"
                    className={proxyClasses('input')}
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
            <div className={proxyClasses('field')}>
                <span className={proxyClasses('label')}>
                    {tProxy(editingDraft.hasCredentials ? 'Password (saved encrypted)' : 'Password')}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className={proxyClasses('input')}
                        placeholder={tProxy(editingDraft.hasCredentials ? 'Leave blank to keep saved password' : 'Enter password')}
                        value={editingDraft.password}
                        onChange={e =>
                            setEditingDraft({
                                ...editingDraft,
                                password: e.target.value
                            })
                        }
                    />
                    <button type="button" className={proxyClasses('button', 'buttonSmall')} onClick={() => setShowPassword(!showPassword)}>
                        {tProxy(showPassword ? 'Hide' : 'Show')}
                    </button>
                </div>
            </div>
        </div>
    );
}
