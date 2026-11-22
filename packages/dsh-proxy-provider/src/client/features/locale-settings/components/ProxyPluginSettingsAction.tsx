import { useEffectiveTheme } from '@kalex/dsh-core';
import { proxyStore, tProxy, useProxyStore } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';
import { ProxySettingsModal } from '../../settings-modal/components/ProxySettingsModal.tsx';
import { ProxyLocaleControl } from './ProxyLocaleSettings.tsx';

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
    const theme = useEffectiveTheme();
    const snap = useProxyStore();

    return (
        <div className="dsh-core-root" data-theme={theme} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ProxyLocaleControl />
            <button type="button" className={proxyClasses('button')} onClick={() => proxyStore.publish({ modalOpen: true })}>
                {tProxy('Proxy settings')}
            </button>
            {snap.modalOpen ? <ProxySettingsModal open onClose={() => proxyStore.publish({ modalOpen: false })} /> : null}
        </div>
    );
}
