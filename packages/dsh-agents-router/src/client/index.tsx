import type React from 'react';
import { CLIENT_PLUGIN_ID, PACKAGE_ID } from '../shared/constants/constants.js';
import type { RouterViewProps } from './app/RouterView.js';
import { RouterViewBoundary } from './app/RouterViewBoundary.js';
import { GlobalSettingsCard, type GlobalSettingsCardProps } from './features/global-settings/GlobalSettingsCard.js';
import { PluginSettingsAction, type PluginSettingsActionProps } from './features/global-settings/PluginSettings.js';
import { locales, resolveLocale } from './locales/index.js';
import { getHostLocale, setHostLocale } from './utils/locale-context.js';

export const name = CLIENT_PLUGIN_ID;
export const inject = ['slots', 'locale'] as const;

export interface DshHostContext {
    slots: {
        inject: (slotName: string, factory: () => void) => void;
        register: (
            metadata: {
                name: string;
                id: string;
                order?: number;
                key?: string;
                label?: () => string;
            },
            component:
                | React.ComponentType<RouterViewProps>
                | React.ComponentType<PluginSettingsActionProps>
                | React.ComponentType<GlobalSettingsCardProps>
        ) => void;
    };
    locale?: {
        preference?: string;
    };
}

export function apply(ctx: DshHostContext): void {
    setHostLocale(ctx.locale?.preference);
    ctx.slots.inject('conversation.view', () =>
        ctx.slots.register(
            {
                name: 'conversation.view',
                id: 'agents-router',
                order: 30,
                label: () => locales[resolveLocale('auto', getHostLocale())].router
            },
            RouterViewBoundary
        )
    );
    ctx.slots.inject('plugins.detail.actions', () =>
        ctx.slots.register(
            {
                name: 'plugins.detail.actions',
                id: 'agents-router-settings-action',
                order: 30
            },
            PluginSettingsAction
        )
    );
    ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
            {
                name: 'plugins.bundle.config',
                key: PACKAGE_ID,
                id: 'agents-router-global-settings',
                order: 30
            },
            GlobalSettingsCard
        )
    );
}
