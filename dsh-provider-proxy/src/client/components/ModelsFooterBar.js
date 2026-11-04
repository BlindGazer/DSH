    function useProxyStore() {
      const [snap, setSnap] = useState(store.snapshot);
      useEffect(() => store.subscribe(setSnap), []);
      return snap;
    }

    function createEmptyDraft() {
      return {
        id: `proxy-${Date.now().toString(36)}`,
        name: '',
        protocol: 'http',
        host: '',
        port: '8080',
        authEnabled: false,
        hasCredentials: false,
        usernameMask: '',
        username: '',
        password: '',
        ignoreSslErrors: false
      };
    }

    function draftFromProfile(p) {
      return {
        id: p.id,
        name: p.name || '',
        protocol: p.protocol || 'http',
        host: p.host || '',
        port: String(p.port || 8080),
        authEnabled: Boolean(p.auth?.enabled),
        hasCredentials: Boolean(p.auth?.hasCredentials),
        usernameMask: p.auth?.usernameMask || '',
        username: '',
        password: '',
        ignoreSslErrors: Boolean(p.ignoreSslErrors)
      };
    }

    function profileFromDraft(d) {
      const portNum = Number(d.port);
      return {
        id: d.id,
        name: d.name.trim(),
        protocol: d.protocol,
        host: sanitizeHost(d.host),
        port: portNum,
        auth: {
          enabled: Boolean(d.authEnabled),
          username: d.username || '',
          password: d.password || ''
        },
        ignoreSslErrors: Boolean(d.ignoreSslErrors)
      };
    }

    function ModelsFooterProxyEntry() {
      const effectiveTheme = useEffectiveTheme();
      const snap = useProxyStore();

      useEffect(() => {
        ensureStyles();
        store.refresh();
      }, []);

      const profilesCount = snap.config?.profiles?.length || 0;
      const activeCount = Object.values(snap.config?.providerBindings || {}).filter(Boolean).length;
      const conflictsCount = snap.conflicts?.length || 0;

      return jsxs(Fragment, {
        children: [
          jsxs('div', {
            className: 'kpp-footer-row',
            'data-theme': effectiveTheme,
            children: [
              jsxs('div', {
                style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
                children: [
                  jsx('button', {
                    type: 'button',
                    className: 'kpp-btn',
                    onClick: () => store.publish({ modalOpen: true }),
                    children: 'Proxy settings'
                  }),
                  jsx('span', {
                    className: 'kpp-host-sub',
                    children: `${profilesCount} profile(s) • ${activeCount} proxied provider(s)`
                  }),
                  conflictsCount > 0
                    ? jsx('span', {
                        className: 'kpp-badge kpp-badge-warn',
                        children: `⚠ ${conflictsCount} host conflict(s)`
                      })
                    : null
                ]
              })
            ]
          }),
          jsx(ProxySettingsModal, {
            open: snap.modalOpen,
            onClose: () => store.publish({ modalOpen: false })
          })
        ]
      });
    }

    function ProxyLocaleSettings() {
      const snap = useProxyStore();
      const effectiveTheme = useEffectiveTheme();
      return jsxs('div', {
        className: 'kpp-locale-settings',
        'data-theme': effectiveTheme,
        children: [
          jsx('label', { className: 'kpp-label', children: 'Interface language' }),
          jsx(KppSelect, {
            ariaLabel: 'Interface language',
            value: snap.locale || 'en',
            options: [{ value: 'en', label: 'English' }, { value: 'ru', label: 'Russian' }],
            onChange: saveProxyLocale
          })
        ]
      });
    }
