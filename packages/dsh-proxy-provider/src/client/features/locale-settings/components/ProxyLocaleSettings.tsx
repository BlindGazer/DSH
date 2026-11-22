import { ThemedSelect, useEffectiveTheme } from '@kalex/dsh-core';
import { saveProxyLocale, tProxy, useProxyStore } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';

/**
 * Панель выбора языка интерфейса плагина прокси в глобальных настройках бандла DSH.
 */
export function ProxyLocaleSettings() {
    const theme = useEffectiveTheme();
    return (
        <div className="dsh-core-root" data-theme={theme}>
            <ProxyLocaleControl />
        </div>
    );
}

export function ProxyLocaleControl() {
    const snap = useProxyStore();
    const currentLocale = snap.locale || 'en';

    return (
        <div className={proxyClasses('localeSettings')}>
            <span className={proxyClasses('label')}>{tProxy('Interface language')}</span>
            <ThemedSelect
                value={currentLocale}
                options={[
                    { value: 'en', label: tProxy('English') },
                    { value: 'ru', label: tProxy('Russian') }
                ]}
                onChange={next => saveProxyLocale(next)}
                showCheckmark={true}
            />
        </div>
    );
}
