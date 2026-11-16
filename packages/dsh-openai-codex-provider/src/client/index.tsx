import { type DshLocaleCode, ensureCoreStyles } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../shared/constants/localizations/OpenAICodexLocalization.js';
import { openAICodexLocaleDictionaries, translateOpenAICodex } from '../shared/constants/localizations/OpenAICodexLocalization.js';
import { TYPERT_REMOTE } from '../shared/remote.js';
import { CodexModelsFooterEntry } from './features/settings/CodexModelsFooterEntry.js';
import { CodexQuotaDock } from './features/settings/CodexQuotaDock.js';
import { ensureCodexFooterStyles } from './features/settings/codexFooterStyles.js';
import type { OpenAICodexClientContext } from './features/settings/openAICodexRuntime.js';
import { OpenAICodexController, registerCodexSlot, selectLocale } from './features/settings/openAICodexRuntime.js';

export const name = '@kalex/dsh-openai-codex-provider';
export const inject: readonly string[] = ['slots', 'locale', 'remote'];

export async function apply(context: OpenAICodexClientContext): Promise<() => Promise<void>> {
    ensureCoreStyles();
    ensureCodexFooterStyles();
    const disposeRemote = await context.remote.$mount(TYPERT_REMOTE);
    const remote = context.get('remote.openaiCodex');
    if (!remote) {
        await disposeRemote();
        throw new Error('OpenAI Codex Remote service did not mount');
    }

    context.effect(
        () => context.locale.register('settings.openai-codex-auth', openAICodexLocaleDictionaries),
        'openai-codex-auth: locale dictionaries'
    );

    const controller = new OpenAICodexController(remote);
    const locale: DshLocaleCode = selectLocale(context.locale.preference);
    const text = (key: OpenAICodexText): string => translateOpenAICodex(locale, key);

    registerCodexSlot(
        context,
        { name: 'settings.models.footer', id: 'openai-codex-auth-models', order: 60, label: text('title') },
        CodexModelsFooterEntry,
        { controller, locale, text },
        text('renderFailure'),
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    registerCodexSlot(
        context,
        { name: 'conversation.composer.dock', id: 'openai-codex-auth-quota', order: 2 },
        CodexQuotaDock,
        { controller, text },
        text('renderFailure'),
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );

    return async () => disposeRemote();
}
