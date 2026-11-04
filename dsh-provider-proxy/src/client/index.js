window.__ModuleLoader__.load({
  id: '@kalex/dsh-provider-proxy',
  factory: (require) => {
    'use strict';

    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const jsxRuntime = require('react/jsx-runtime');

    const { useState, useEffect, useRef } = React;
    const { jsx: baseJsx, jsxs: baseJsxs, Fragment } = jsxRuntime;
    const localizeProps = (props) => {
      if (!props) return props;
      const localized = { ...props };
      for (const key of ['children', 'title', 'placeholder', 'label', 'aria-label', 'ariaLabel']) {
        if (typeof localized[key] === 'string') localized[key] = translateProxyText(localized[key]);
        else if (Array.isArray(localized[key])) localized[key] = localized[key].map((value) => typeof value === 'string' ? translateProxyText(value) : value);
      }
      if (Array.isArray(localized.options)) localized.options = localized.options.map((option) => ({ ...option, label: translateProxyText(option.label) }));
      return localized;
    };
    const jsx = (type, props, key) => baseJsx(type, localizeProps(props), key);
    const jsxs = (type, props, key) => baseJsxs(type, localizeProps(props), key);

    const API_BASE = '/api/kalex-provider-proxy';
    const DEFAULT_TEST_URL = 'https://generativelanguage.googleapis.com';
    const KNOWN_SETTINGS_NS = [
      'llm-pi-ai',
      'llm-deepseek',
      'llm-deepseek-account',
      'llm-deepseek-api-key',
      ''
    ];

/* __KPP_CLIENT_SOURCES__ */
    const inject = ['slots', 'locale'];

    function apply(ctx) {
      store.publish({ locale: loadProxyLocale(ctx.locale?.preference) });
      ensureStyles();
      store.refresh();

      // 1. Register `Proxy settings` button in `settings.models.footer`
      ctx.slots.inject('settings.models.footer', () =>
        ctx.slots.register(
          {
            name: 'settings.models.footer',
            id: 'kalex-provider-proxy-footer',
            order: 50,
            label: translateProxyText('Proxy settings')
          },
          ModelsFooterProxyEntry
        )
      );

      ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
          {
            name: 'plugins.bundle.config',
            key: '@kalex/dsh-provider-proxy',
            id: 'kalex-provider-proxy-language',
            order: 50
          },
          ProxyLocaleSettings
        )
      );

      // 2. Register per-provider card controls in `settings.models.provider-card`
      ctx.slots.inject('settings.models.provider-card', () => {
        const disposers = [];
        const registeredKeys = new Set();

        const registerKey = (key) => {
          if (registeredKeys.has(key)) return;
          registeredKeys.add(key);
          try {
            disposers.push(
              ctx.slots.register(
                {
                  name: 'settings.models.provider-card',
                  key
                },
                ProviderCardProxyEntry
              )
            );
          } catch {
            /* ignore if key already occupied */
          }
        };

        for (const ns of KNOWN_SETTINGS_NS) {
          registerKey(ns);
        }

        const unsub = store.subscribe((snap) => {
          for (const p of snap.providers || []) {
            if (typeof p.settingsNs === 'string') {
              registerKey(p.settingsNs);
            }
            if (typeof p.id === 'string') {
              registerKey(p.id);
            }
          }
        });

        return () => {
          unsub();
          for (const dispose of disposers) {
            try {
              dispose?.();
            } catch {
              /* ignore */
            }
          }
        };
      });
    }

    exports.name = 'kalex-provider-proxy-client';
    exports.apply = apply;
    exports.inject = inject;
    exports.ProviderCardProxyEntry = ProviderCardProxyEntry;
    exports.ModelsFooterProxyEntry = ModelsFooterProxyEntry;
    exports.ProxySettingsModal = ProxySettingsModal;
    return module.exports;
  }
});
