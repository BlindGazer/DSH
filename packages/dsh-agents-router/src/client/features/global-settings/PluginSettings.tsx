import type React from 'react';
import { useState } from 'react';
import { PACKAGE_ID } from '../../../shared/constants/constants.js';
import { locales, resolveLocale } from '../../locales/index.js';
import { getHostLocale } from '../../utils/locale-context.js';
import { GlobalSettingsCard } from './GlobalSettingsCard.js';

export interface PluginSettingsActionProps {
    subject?: {
        kind?: string;
        pkg?: { name?: string };
    };
}

export function PluginSettingsAction({ subject }: PluginSettingsActionProps): React.JSX.Element | null {
    const [modalOpen, setModalOpen] = useState(false);
    if (subject?.pkg?.name !== PACKAGE_ID) return null;
    const locale = resolveLocale('auto', getHostLocale());
    const t = (key: string): string => (locales[locale] as Record<string, string>)[key] ?? key;

    return (
        <>
            <button
                className="ar-settings-jump"
                type="button"
                onClick={() => {
                    const card = document.getElementById('agents-router-global-settings');
                    if (subject.kind === 'bundle' && card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    else setModalOpen(true);
                }}>
                <span aria-hidden="true">&#x2699;</span>
                {t('settingsAction')}
            </button>
            {modalOpen ? (
                <div className="ar-settings-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('globalSettings')}>
                    <GlobalSettingsCard isModal onClose={() => setModalOpen(false)} />
                </div>
            ) : null}
        </>
    );
}

export { GlobalSettingsCard as PluginSettingsView } from './GlobalSettingsCard.js';
