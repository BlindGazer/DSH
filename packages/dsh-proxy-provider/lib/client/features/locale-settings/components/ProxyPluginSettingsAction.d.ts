export interface ProxyPluginSettingsActionProps {
    readonly subject?: {
        readonly pkg?: {
            readonly name?: string;
        };
    };
}
/** Exposes Proxy controls on its Plugin Manager detail row as well as its bundle page. */
export declare function ProxyPluginSettingsAction({ subject }: ProxyPluginSettingsActionProps): import("react").JSX.Element | undefined;
