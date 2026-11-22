import { type DshLocaleCode, ensureCoreStyles } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../shared/constants/localizations/OpenAICodexLocalization.ts';
import { openAICodexLocaleDictionaries, translateOpenAICodex } from '../shared/constants/localizations/OpenAICodexLocalization.ts';
import { TYPERT_REMOTE } from '../shared/remote.ts';
import { startAccountPolling } from './features/settings/accountPollingLifetime.ts';
import { CodexModelsFooterEntry } from './features/settings/CodexModelsFooterEntry.tsx';
import { CodexQuotaDock } from './features/settings/CodexQuotaDock.tsx';
import { ensureCodexFooterStyles } from './features/settings/codexFooterStyles.ts';
import type { OpenAICodexClientContext } from './features/settings/openAICodexRuntime.ts';
import { OpenAICodexController, registerCodexSlot, selectLocale } from './features/settings/openAICodexRuntime.ts';
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
    context.effect(() => context.locale.register('settings.openai-hub', openAICodexLocaleDictionaries), 'openai-hub: locale dictionaries');
    const controller = new OpenAICodexController(remote);
    context.effect(() => startAccountPolling(controller), 'openai-hub: persistent account quota timers');
    const locale: DshLocaleCode = selectLocale(context.locale.preference);
    const text = (key: OpenAICodexText): string => translateOpenAICodex(locale, key);
    registerCodexSlot(
        context,
        { name: 'settings.models.footer', id: 'openai-hub-models', order: 60, label: text('title') },
        CodexModelsFooterEntry,
        { controller, locale, text },
        text('renderFailure'),
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    registerCodexSlot(
        context,
        { name: 'conversation.composer.dock', id: 'openai-hub-quota', order: 2 },
        CodexQuotaDock,
        { controller, directories: context.modelDirectories, text },
        text('renderFailure'),
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    return async () => {
        await disposeRemote();
    };
}
