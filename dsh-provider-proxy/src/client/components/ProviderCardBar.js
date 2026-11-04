    function ProviderCardProxyEntry(props) {
      const effectiveTheme = useEffectiveTheme();
      const snap = useProxyStore();
      const providerEntry = props?.provider;
      const providerId =
        (typeof providerEntry === 'string' ? providerEntry : providerEntry?.provider || providerEntry?.id) ||
        props?.providerId ||
        '';

      useEffect(() => {
        if (store.snapshot.loading) {
          store.refresh();
        }
      }, []);

      if (!providerId) return null;

      const profiles = snap.config?.profiles || [];
      const boundProfileId = snap.config?.providerBindings?.[providerId] || '';
      const activeProfile = profiles.find((p) => p.id === boundProfileId) || null;
      const conflict = (snap.conflicts || []).find((c) =>
        c.providers?.some((p) => p.providerId === providerId)
      );

      const dropdownOptions = [
        { value: '', label: 'Direct (No proxy)' },
        ...profiles.map((p) => ({
          value: p.id,
          label: `${p.name} (${p.protocol.toUpperCase()} ${p.host}:${p.port})`
        }))
      ];

      const handleSelectChange = async (nextVal) => {
        const nextId = nextVal || null;
        try {
          await store.bindProvider(providerId, nextId);
        } catch (err) {
          store.publish({ error: err?.message || 'Failed to update proxy binding' });
        }
      };

      return jsxs('div', {
        className: 'kpp-card-bar',
        'data-theme': effectiveTheme,
        'data-testid': `proxy-card-${providerId}`,
        children: [
          jsxs('div', {
            className: 'kpp-card-left',
            children: [
              jsx(KppSelect, {
                ariaLabel: `Proxy profile for ${providerId}`,
                value: activeProfile ? activeProfile.id : '',
                options: dropdownOptions,
                onChange: handleSelectChange
              }),
              conflict
                ? jsx('span', {
                    className: 'kpp-badge kpp-badge-warn',
                    title: `Host ${conflict.host} is shared by multiple providers with different proxy settings. Active proxy "${conflict.appliedProfileName}" is applied to the entire host.`,
                    children: `⚠ Host conflict (${conflict.host} → ${conflict.appliedProfileName})`
                  })
                : null
            ]
          }),
          jsx('div', {
            className: 'kpp-card-right',
            children: jsx('button', {
              type: 'button',
              className: 'kpp-btn kpp-btn-icon',
              'aria-label': 'Proxy settings',
              title: 'Proxy settings',
              onClick: () => store.publish({ modalOpen: true }),
              children: jsx('svg', {
                width: 16,
                height: 16,
                viewBox: '0 0 24 24',
                fill: 'currentColor',
                'aria-hidden': true,
                children: jsx('path', {
                  d: 'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.21l-2.39.96a7.2 7.2 0 0 0-1.62-.92l-.36-2.57a.5.5 0 0 0-.47-.41h-3.84a.5.5 0 0 0-.47.41L9.26 5.38a7.2 7.2 0 0 0-1.62.92l-2.39-.96a.5.5 0 0 0-.59.21L2.74 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.21.37.29.59.21l2.39-.96c.5.38 1.03.69 1.62.92l.36 2.57a.5.5 0 0 0 .47.41h3.84a.5.5 0 0 0 .47-.41l.36-2.57a7.2 7.2 0 0 0 1.62-.92l2.39.96a.5.5 0 0 0 .59-.21l1.92-3.32a.5.5 0 0 0-.12-.61l-2.02-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z'
                })
              })
            })
          })
        ]
      });
    }

