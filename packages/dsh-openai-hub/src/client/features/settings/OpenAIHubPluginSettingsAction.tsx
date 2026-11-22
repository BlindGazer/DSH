import { Button, Modal } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import { PackageId } from '../../../shared/constants/runtime.ts';
import type { OpenAIHubRemote } from '../../../shared/remote.ts';

export interface OpenAIHubPluginSettingsActionProps {
    readonly subject?: { readonly kind?: string; readonly pkg?: { readonly name?: string } };
    readonly remote: OpenAIHubRemote;
    readonly text: (key: OpenAICodexText) => string;
}

export function OpenAIHubPluginSettingsAction({ subject, remote, text }: OpenAIHubPluginSettingsActionProps) {
    if (subject?.pkg?.name !== PackageId) return undefined;
    return (
        <Modal open={false} onClose={() => undefined} title={text('title')} closeLabel={text('close')}>
            <Button onClick={() => void remote.snapshot()}>{text('title')}</Button>
        </Modal>
    );
}
