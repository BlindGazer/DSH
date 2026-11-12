import type { DshLocaleCode } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../shared/constants/localizations/OpenAICodexLocalization.js';
import { openAICodexLocaleDictionaries, translateOpenAICodex } from '../shared/constants/localizations/OpenAICodexLocalization.js';
import { TYPERT_REMOTE } from '../shared/remote.js';
import { CodexQuotaDock } from './features/settings/CodexQuotaDock.js';
import { CodexSettingsPanel } from './features/settings/CodexSettingsPanel.js';
import type { OpenAICodexClientContext } from './features/settings/openAICodexRuntime.js';
import { OpenAICodexController, registerCodexSlot, selectLocale } from './features/settings/openAICodexRuntime.js';

export const name = 'dsh-openai-codex-auth';
export const inject: readonly string[] = ['slots', 'locale', 'remote'];

export async function apply(context: OpenAICodexClientContext): Promise<() => Promise<void>> {
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
        { name: 'settings.models.footer', id: 'openai-codex-auth-models', order: 60, label: text('editModels') },
        CodexSettingsPanel,
        { controller, locale, text }
    );
    registerCodexSlot(context, { name: 'conversation.composer.dock', id: 'openai-codex-auth-quota', order: 2 }, CodexQuotaDock, {
        controller,
        text
    });

    return async () => disposeRemote();
}
