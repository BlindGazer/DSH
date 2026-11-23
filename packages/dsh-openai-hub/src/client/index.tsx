import { ensureCoreStyles } from '@kalex/dsh-core';
import { openAICodexLocaleDictionaries } from '../shared/constants/localizations/OpenAICodexLocalization.ts';
import { TYPERT_REMOTE } from '../shared/remote.ts';
import { startAccountPolling } from './features/settings/accountPollingLifetime.ts';
import { CodexModelsFooterEntry } from './features/settings/CodexModelsFooterEntry.tsx';
import { CodexQuotaDock } from './features/settings/CodexQuotaDock.tsx';
import { ensureCodexFooterStyles } from './features/settings/codexFooterStyles.ts';
import type { OpenAICodexClientContext } from './features/settings/openAICodexRuntime.ts';
import { OpenAICodexController, registerCodexSlot } from './features/settings/openAICodexRuntime.ts';
import { createOpenAIHubRemote } from './features/settings/remoteBoundary.ts';

export const name = '@kalex/dsh-openai-hub';
export const inject: readonly string[] = ['slots', 'locale', 'remote', 'modelDirectories'];
export async function apply(context: OpenAICodexClientContext): Promise<() => Promise<void>> {
    ensureCoreStyles();
    ensureCodexFooterStyles();
    const disposeRemote = await context.remote.$mount(TYPERT_REMOTE);
    const wire = context.get('remote.openaiHub');
    if (!wire) {
        await disposeRemote();
        throw new Error('OpenAI Hub Remote service did not mount');
    }
    const remote = createOpenAIHubRemote(wire);
    const namespace = 'settings.openai-hub';
    for (const [language, dictionary] of Object.entries(openAICodexLocaleDictionaries)) {
        context.effect(() => context.locale.register(namespace, language, dictionary), `openai-hub: locale ${language}`);
    }
    const label = context.locale.bind(namespace);
    const controller = new OpenAICodexController(remote);
    context.effect(() => startAccountPolling(controller), 'openai-hub: persistent account quota timers');
    registerCodexSlot(
        context,
        { name: 'settings.models.footer', id: 'openai-hub-models', order: 60, locale: namespace, label: () => label('title') },
        CodexModelsFooterEntry,
        { controller },
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    registerCodexSlot(
        context,
        { name: 'conversation.composer.dock', id: 'openai-hub-quota', order: 2, locale: namespace },
        CodexQuotaDock,
        { controller, directories: context.modelDirectories },
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    return async () => {
        await disposeRemote();
    };
}
