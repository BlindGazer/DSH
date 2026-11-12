import { buildCoreThemeStyles, subscribeDshThemeChanges } from '@kalex/dsh-core';

export const styles = `
.addir-modal {
    width: min(560px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    gap: 0;
}
.addir-editor, .addir-settings * { box-sizing: border-box; }
.addir-editor {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
    color: var(--dsh-ui-text);
}
.addir-name {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--dsh-ui-border-strong);
    border-radius: 8px;
    background: var(--dsh-ui-elevated);
    color: var(--dsh-ui-text);
    font: inherit;
}
.addir-name:focus-visible { outline: 2px solid var(--dsh-ui-focus-ring); outline-offset: 1px; }
.addir-source { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.addir-heading { margin: 0; font-size: 14px; font-weight: 600; line-height: 22px; }
.addir-folder-list { min-width: 0; overflow: hidden; border: 1px solid var(--dsh-ui-border); border-radius: 12px; }
.addir-folder { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; min-width: 0; min-height: 68px; padding: 12px 14px; }
.addir-folder + .addir-folder { border-top: 1px solid var(--dsh-ui-border); }
.addir-folder-info { display: flex; flex: 1 1 180px; flex-direction: column; gap: 4px; min-width: 0; }
.addir-folder-name { overflow-wrap: anywhere; font-size: 14px; line-height: 20px; }
.addir-folder-path { color: var(--dsh-ui-muted); font-size: 12px; overflow-wrap: anywhere; }
.addir-primary { flex: 0 0 auto; color: var(--dsh-ui-muted); font-size: 12px; }
.addir-folder-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.addir-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.addir-check input { accent-color: var(--dsh-ui-accent); }
.addir-check input:focus-visible { outline: 2px solid var(--dsh-ui-focus-ring); outline-offset: 2px; }
.addir-folder-list > .dsh-btn { margin: 10px; }
.addir-footer-spacer { flex: 1 1 auto; }
.addir-modal-actions, .addir-confirm-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.addir-modal-actions { padding-top: 12px; border-top: 1px solid var(--dsh-ui-border); }
.addir-confirm { display: flex; flex-direction: column; gap: 12px; }
.addir-confirm p { margin: 0; font-size: 14px; line-height: 22px; }
.addir-error { color: var(--dsh-ui-danger); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.addir-settings { display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 720px; min-width: 0; color: var(--dsh-ui-text); }
.addir-settings h2 { margin: 0; font-size: 20px; font-weight: 600; }
.addir-settings p { margin: 0; color: var(--dsh-ui-muted); font-size: 13px; line-height: 1.6; }
.addir-setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 0; padding: 14px 0; border-bottom: 1px solid var(--dsh-ui-border); }
.addir-setting > span { min-width: 0; overflow-wrap: anywhere; }
.addir-setting > div { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.addir-setting .dsh-switch { flex: 0 0 auto; }
.addir-workspace-editors { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.addir-workspace-editors h3 { margin: 0; font-size: 16px; }
.addir-workspace-editors .addir-setting > span { flex: 1 1 auto; }
.addir-settings :focus-visible, .addir-editor :focus-visible { outline-color: var(--dsh-ui-focus-ring); }
@media (max-width: 520px) {
    .addir-editor { padding: 16px; }
    .addir-modal-actions { justify-content: flex-start; }
    .addir-footer-spacer { display: none; }
    .addir-folder-info { flex-basis: 100%; }
}
`;

const WORKSPACE_MANAGER_STYLE_ID = '@kalex/dsh-workspace-manager/styles';
let themeChangesSubscribed = false;

/** Вставляет общие и локальные стили, чтобы тема совпадала с остальными интерфейсами DSH. */
export function ensureWorkspaceManagerStyles(): void {
    if (typeof document === 'undefined' || !document.head) return;
    const existing = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${WORKSPACE_MANAGER_STYLE_ID}"]`);
    const styleText = `${buildCoreThemeStyles()}\n${styles}`;
    if (existing) {
        existing.textContent = styleText;
    } else {
        const tag = document.createElement('style');
        tag.dataset.plugin = '@kalex/dsh-workspace-manager';
        tag.dataset.pluginCss = WORKSPACE_MANAGER_STYLE_ID;
        tag.textContent = styleText;
        document.head.appendChild(tag);
    }
    if (!themeChangesSubscribed) {
        subscribeDshThemeChanges(ensureWorkspaceManagerStyles);
        themeChangesSubscribed = true;
    }
}
