import type { DshLocalizedClientContext } from '@kalex/dsh-core';
import { CLIENT_PLUGIN_ID, PACKAGE_ID } from '../shared/constants/constants.ts';
import { locales } from '../shared/constants/localizations/RouterUiLocalization.ts';
import { RouterViewBoundary } from './app/RouterViewBoundary.tsx';
import { GlobalSettingsCard } from './features/global-settings/GlobalSettingsCard.tsx';
import { PluginSettingsAction, type PluginSettingsActionProps } from './features/global-settings/PluginSettings.tsx';

export const name = CLIENT_PLUGIN_ID;
export const inject = ['slots', 'locale'] as const;

interface RouterClientContext extends DshLocalizedClientContext {
    effect(setup: () => () => void, label: string): void;
}

export function apply(ctx: RouterClientContext): void {
    const namespace = CLIENT_PLUGIN_ID;
    for (const [language, dictionary] of Object.entries(locales)) {
        ctx.effect(() => ctx.locale.register(namespace, language, dictionary), `${namespace}: ${language}`);
    }
    const translateLabel = ctx.locale.bind(namespace);
    ctx.slots.inject('conversation.view', () =>
        ctx.slots.register<{ sessionId: string }>(
            { name: 'conversation.view', id: 'agents-router', order: 30, locale: namespace, label: () => translateLabel('router') },
            ({ sessionId, t }) => <RouterViewBoundary sessionId={sessionId} t={t} locale={ctx.locale.getSnapshot().active} />
        )
    );
    ctx.slots.inject('plugins.detail.actions', () =>
        ctx.slots.register<Omit<PluginSettingsActionProps, 't'>>(
            { name: 'plugins.detail.actions', id: 'agents-router-settings-action', order: 30, locale: namespace },
            PluginSettingsAction
        )
    );
    ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
            { name: 'plugins.bundle.config', key: PACKAGE_ID, id: 'agents-router-global-settings', order: 30, locale: namespace },
            ({ t }) => <GlobalSettingsCard t={t} />
        )
    );
}
