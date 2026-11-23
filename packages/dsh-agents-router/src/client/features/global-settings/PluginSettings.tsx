import type { DshLocalizedSlotProps } from '@kalex/dsh-core';
import type React from 'react';
import { useState } from 'react';
import { PACKAGE_ID } from '../../../shared/constants/constants.ts';
import { GlobalSettingsCard, SettingsRoot } from './GlobalSettingsCard.tsx';

export interface PluginSettingsActionProps extends DshLocalizedSlotProps {
    subject?: {
        kind?: string;
        pkg?: { name?: string };
    };
}

export function PluginSettingsAction({ subject, t }: PluginSettingsActionProps): React.JSX.Element | undefined {
    const [modalOpen, setModalOpen] = useState(false);
    if (subject?.pkg?.name !== PACKAGE_ID) return undefined;

    return (
        <SettingsRoot preference="auto">
            <button
                className="ar-settings-jump"
                type="button"
                onClick={() => {
                    const card = document.getElementById('agents-router-global-settings');
                    if (subject.kind === 'bundle' && card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    else setModalOpen(true);
                }}>
                <span>&#x2699;</span>
                {t('settingsAction')}
            </button>
            {modalOpen ? (
                <div className="ar-settings-modal-backdrop">
                    <GlobalSettingsCard t={t} isModal onClose={() => setModalOpen(false)} />
                </div>
            ) : null}
        </SettingsRoot>
    );
}

export { GlobalSettingsCard as PluginSettingsView } from './GlobalSettingsCard.tsx';
