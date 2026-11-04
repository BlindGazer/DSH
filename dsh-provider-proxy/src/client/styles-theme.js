    /* __KPP_THEME_HOOK__ */

    function ensureStyles() {
      if (typeof document === 'undefined') return;
      const existing = document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`);
      if (existing) {
        existing.textContent = CSS_TEXT;
        return;
      }
      const tag = document.createElement('style');
      tag.dataset.plugin = '@kalex/dsh-provider-proxy';
      tag.dataset.pluginCss = STYLE_ID;
      tag.textContent = CSS_TEXT;
      document.head.appendChild(tag);
    }

