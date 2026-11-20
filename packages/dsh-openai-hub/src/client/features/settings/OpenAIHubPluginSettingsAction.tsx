import { Button, Modal, useEffectiveTheme } from '@kalex/dsh-core';
import { useState } from 'react';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import { PackageId } from '../../../shared/constants/runtime.js';
import type { OpenAIHubRemote } from '../../../shared/remote.js';
import { OpenAIHubLoggingSettings } from './OpenAIHubLoggingSettings.js';

export interface OpenAIHubPluginSettingsActionProps {
    readonly subject?: {
        readonly kind?: string;
        readonly pkg?: { readonly name?: string };
    };
    readonly remote: OpenAIHubRemote;
    readonly text: (key: OpenAICodexText) => string;
}

export function OpenAIHubPluginSettingsAction({ subject, remote, text }: OpenAIHubPluginSettingsActionProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const theme = useEffectiveTheme();
    if (subject?.pkg?.name !== PackageId) return undefined;

    return (
        <>
            <Button
                onClick={() => {
                    const card = document.getElementById('openai-hub-logging-settings');
                    if (subject.kind === 'bundle' && card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    else setModalOpen(true);
                }}>
                {text('settingsAction')}
            </Button>
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={text('loggingTitle')}
                closeLabel={text('close')}
                theme={theme}>
                <OpenAIHubLoggingSettings remote={remote} text={text} />
            </Modal>
        </>
    );
}
