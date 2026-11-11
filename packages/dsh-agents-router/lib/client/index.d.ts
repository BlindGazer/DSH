import type React from 'react';
import type { RouterViewProps } from './app/RouterView.js';
import { type GlobalSettingsCardProps } from './features/global-settings/GlobalSettingsCard.js';
import { type PluginSettingsActionProps } from './features/global-settings/PluginSettings.js';
export declare const name = "dsh-agents-router-client";
export declare const inject: readonly ['slots', 'locale'];
export interface DshHostContext {
    slots: {
        inject: (slotName: string, factory: () => void) => void;
        register: (metadata: {
            name: string;
            id: string;
            order?: number;
            key?: string;
            label?: () => string;
        }, component: React.ComponentType<RouterViewProps> | React.ComponentType<PluginSettingsActionProps> | React.ComponentType<GlobalSettingsCardProps>) => void;
    };
    locale?: {
        preference?: string;
    };
}
export declare function apply(ctx: DshHostContext): void;
