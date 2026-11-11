import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { ProxySettingsModal } from '../../settings-modal/components/ProxySettingsModal.js';
import { ProxyLocaleSettings } from './ProxyLocaleSettings.js';

const PACKAGE_ID = '@kalex/dsh-proxy-provider';

export interface ProxyPluginSettingsActionProps {
    readonly subject?: {
        readonly pkg?: { readonly name?: string };
    };
}

/** Exposes Proxy controls on its Plugin Manager detail row as well as its bundle page. */
export function ProxyPluginSettingsAction({ subject }: ProxyPluginSettingsActionProps) {
    if (subject?.pkg?.name !== PACKAGE_ID) return undefined;
    return <ProxyPluginSettingsActionContent />;
}

function ProxyPluginSettingsActionContent() {
    const snap = useProxyStore();

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ProxyLocaleSettings />
            <button type="button" className="kpp-btn" onClick={() => proxyStore.publish({ modalOpen: true })}>
                {tProxy('Proxy settings')}
            </button>
            {snap.modalOpen ? <ProxySettingsModal open onClose={() => proxyStore.publish({ modalOpen: false })} /> : null}
        </div>
    );
}
