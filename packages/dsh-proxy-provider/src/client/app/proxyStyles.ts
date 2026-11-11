import { buildCoreThemeStyles, subscribeDshThemeChanges } from '@kalex/dsh-core';
import proxyStyles from './proxyStyles.module.scss';
import proxyStyleText from './proxyStyles.module.scss?inline';

export const PROXY_STYLE_ID = '@kalex/dsh-proxy-provider/styles';
export const proxyScopeClass = proxyStyles.scope;

let themeChangesSubscribed = false;

/**
 * Инжектирует стили SCSS-модуля прокси и динамические токены темы в head документа.
 */
export function ensureProxyStyles(): void {
    if (typeof document === 'undefined' || !document.head) return;
    const existing = document.querySelector?.(`style[data-plugin-css="${PROXY_STYLE_ID}"]`);
    const styleText = `${buildCoreThemeStyles()}\n${proxyStyleText}`;
    if (existing) {
        existing.textContent = styleText;
    } else {
        const tag = document.createElement('style');
        tag.dataset.plugin = '@kalex/dsh-proxy-provider';
        tag.dataset.pluginCss = PROXY_STYLE_ID;
        tag.textContent = styleText;
        document.head.appendChild(tag);
    }
    if (!themeChangesSubscribed) {
        subscribeDshThemeChanges(ensureProxyStyles);
        themeChangesSubscribed = true;
    }
}
