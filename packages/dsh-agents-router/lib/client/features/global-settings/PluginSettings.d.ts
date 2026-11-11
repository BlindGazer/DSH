import type React from 'react';
export interface PluginSettingsActionProps {
    subject?: {
        kind?: string;
        pkg?: {
            name?: string;
        };
    };
}
export declare function PluginSettingsAction({ subject }: PluginSettingsActionProps): React.JSX.Element | null;
export { GlobalSettingsCard as PluginSettingsView } from './GlobalSettingsCard.js';
