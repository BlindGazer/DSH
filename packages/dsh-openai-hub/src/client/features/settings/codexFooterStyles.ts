import { buildCoreThemeStyles, subscribeDshThemeChanges } from '@kalex/dsh-core';
import footerStyleText from './codexFooterStyles.module.scss?inline';
import panelStyleText from './codexStyles.module.scss?inline';

export const CODEX_FOOTER_STYLE_ID = '@kalex/dsh-openai-hub/footer-styles';

let themeChangesSubscribed = false;

export function ensureCodexFooterStyles(): void {
    if (typeof document === 'undefined' || !document.head) return;
    const styleText = `${buildCoreThemeStyles()}\n${footerStyleText}\n${panelStyleText}`;
    const existing = document.querySelector(`style[data-plugin-css="${CODEX_FOOTER_STYLE_ID}"]`);
    if (existing) {
        existing.textContent = styleText;
    } else {
        const tag = document.createElement('style');
        tag.dataset.plugin = '@kalex/dsh-openai-hub';
        tag.dataset.pluginCss = CODEX_FOOTER_STYLE_ID;
        tag.textContent = styleText;
        document.head.appendChild(tag);
    }
    if (!themeChangesSubscribed) {
        subscribeDshThemeChanges(ensureCodexFooterStyles);
        themeChangesSubscribed = true;
    }
}
