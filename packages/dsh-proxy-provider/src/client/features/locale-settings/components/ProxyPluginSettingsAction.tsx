import { type DshLocalizedSlotProps, useEffectiveTheme } from '@kalex/dsh-core';
import { proxyStore, useProxyStore } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';
import { ProxySettingsModal } from '../../settings-modal/components/ProxySettingsModal.tsx';

const PACKAGE_ID = '@kalex/dsh-proxy-provider';

export interface ProxyPluginSettingsActionProps extends DshLocalizedSlotProps {
    readonly active?: string;
    readonly subject?: {
        readonly pkg?: { readonly name?: string };
    };
}

/** Expose Proxy settings on its Plugin Manager detail row. */
export function ProxyPluginSettingsAction({ subject, t, active = 'en' }: ProxyPluginSettingsActionProps) {
    if (subject?.pkg?.name !== PACKAGE_ID) return undefined;
    return <ProxyPluginSettingsActionContent t={t} active={active} />;
}

function ProxyPluginSettingsActionContent({ t, active }: DshLocalizedSlotProps & { readonly active: string }) {
    const theme = useEffectiveTheme();
    const snap = useProxyStore();

    return (
        <div className="dsh-core-root" data-theme={theme} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={proxyClasses('button')} onClick={() => proxyStore.publish({ modalOpen: true })}>
                {t('Proxy settings')}
            </button>
            {snap.modalOpen ? (
                <ProxySettingsModal active={active} t={t} open onClose={() => proxyStore.publish({ modalOpen: false })} />
            ) : null}
        </div>
    );
}
