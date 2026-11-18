import { ThemedSelect, useEffectiveTheme } from '@kalex/dsh-core';
import { saveProxyLocale, tProxy, useProxyStore } from '../../../app/proxyStore.js';
import { proxyClasses } from '../../../app/proxyStyles.js';

/**
 * Панель выбора языка интерфейса плагина прокси в глобальных настройках бандла DSH.
 */
export function ProxyLocaleSettings() {
    const snap = useProxyStore();
    const effectiveTheme = useEffectiveTheme();
    const currentLocale = snap.locale || 'en';

    return (
        <div className={`dsh-core-root ${proxyClasses('localeSettings')}`} data-theme={effectiveTheme}>
            <span className={proxyClasses('label')}>{tProxy('Interface language')}</span>
            <ThemedSelect
                ariaLabel={tProxy('Interface language')}
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
