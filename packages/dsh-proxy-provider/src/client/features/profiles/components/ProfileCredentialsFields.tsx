import type { DshLocalizedSlotProps } from '@kalex/dsh-core';
import type { ProfileDraft } from '../../../../shared/models/ProxyModels.ts';

import { proxyClasses } from '../../../app/proxyStyles.ts';

export interface ProfileCredentialsFieldsProps extends DshLocalizedSlotProps {
    readonly editingDraft: ProfileDraft;
    readonly setEditingDraft: (next: ProfileDraft) => void;
    readonly showPassword: boolean;
    readonly setShowPassword: (next: boolean) => void;
}

/**
 * Поля ввода имени пользователя и пароля для профиля прокси с поддержкой скрытия/отображения.
 */
export function ProfileCredentialsFields({
    editingDraft,
    setEditingDraft,
    showPassword,
    setShowPassword,
    t
}: ProfileCredentialsFieldsProps) {
    return (
        <div className={proxyClasses('gridTwo')}>
            <label className={proxyClasses('field')}>
                <span className={proxyClasses('label')}>
                    {editingDraft.hasCredentials ? t('savedUsername', { username: editingDraft.usernameMask || t('Yes') }) : t('Username')}
                </span>
                <input
                    type="text"
                    className={proxyClasses('input')}
                    placeholder={t(editingDraft.hasCredentials ? 'Leave blank to keep saved username' : 'Enter username')}
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
                <span className={proxyClasses('label')}>{t(editingDraft.hasCredentials ? 'Password (saved encrypted)' : 'Password')}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className={proxyClasses('input')}
                        placeholder={t(editingDraft.hasCredentials ? 'Leave blank to keep saved password' : 'Enter password')}
                        value={editingDraft.password}
                        onChange={e =>
                            setEditingDraft({
                                ...editingDraft,
                                password: e.target.value
                            })
                        }
                    />
                    <button type="button" className={proxyClasses('button', 'buttonSmall')} onClick={() => setShowPassword(!showPassword)}>
                        {t(showPassword ? 'Hide' : 'Show')}
                    </button>
                </div>
            </div>
        </div>
    );
}
