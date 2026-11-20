import { type DshLocaleCode, ensureCoreStyles } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../shared/constants/localizations/OpenAICodexLocalization.js';
import { openAICodexLocaleDictionaries, translateOpenAICodex } from '../shared/constants/localizations/OpenAICodexLocalization.js';
import { PackageId } from '../shared/constants/runtime.js';
import { TYPERT_REMOTE } from '../shared/remote.js';
import { startAccountPolling } from './features/settings/accountPollingLifetime.js';
import { CodexModelsFooterEntry } from './features/settings/CodexModelsFooterEntry.js';
import { CodexQuotaDock } from './features/settings/CodexQuotaDock.js';
import { ensureCodexFooterStyles } from './features/settings/codexFooterStyles.js';
import { OpenAIHubLoggingSettings } from './features/settings/OpenAIHubLoggingSettings.js';
import { OpenAIHubPluginSettingsAction } from './features/settings/OpenAIHubPluginSettingsAction.js';
import type { OpenAICodexClientContext } from './features/settings/openAICodexRuntime.js';
import { OpenAICodexController, registerCodexSlot, selectLocale } from './features/settings/openAICodexRuntime.js';
import { createOpenAIHubRemote } from './features/settings/remoteBoundary.js';

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
    void remote.recordClientLog({ event: 'plugin', phase: 'started' }).catch(() => undefined);
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
    registerCodexSlot(
        context,
        { name: 'plugins.detail.actions', id: 'openai-hub-settings-action', order: 30 },
        OpenAIHubPluginSettingsAction,
        { remote, text },
        text('renderFailure'),
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    registerCodexSlot(
        context,
        { name: 'plugins.bundle.config', key: PackageId, id: 'openai-hub-logging-settings', order: 30 },
        OpenAIHubLoggingSettings,
        { remote, text },
        text('renderFailure'),
        error => remote.reportUiError(error),
        componentId => remote.reportUiReady(componentId)
    );
    return async () => {
        await remote.recordClientLog({ event: 'plugin', phase: 'stopped' }).catch(() => undefined);
        await disposeRemote();
    };
}
