function RoutingSection(props) {
  const { providers, profiles, bindings, conflicts, providerSearch, setProviderSearch, store, KppSelect } = props
  const routingOptions = [
    { value: '', label: 'Direct (No proxy)' },
    ...profiles.map((profile) => ({
      value: profile.id,
      label: `${profile.name} (${profile.protocol.toUpperCase()} ${profile.host}:${profile.port})`
    }))
  ]
  const searchNeedle = providerSearch.trim().toLowerCase()
  const filteredProviders = searchNeedle
    ? providers.filter((provider) => {
        const nameMatch = (provider.name || '').toLowerCase().includes(searchNeedle)
        const idMatch = (provider.id || '').toLowerCase().includes(searchNeedle)
        const hostMatch = (provider.hosts || []).some((host) => host.toLowerCase().includes(searchNeedle))
        return nameMatch || idMatch || hostMatch
      })
    : providers
  return jsxs('div', {
                  className: 'kpp-section',
                  children: [
                    jsxs('div', {
                      className: 'kpp-section-head',
                      children: [
                        jsx('h3', {
                          className: 'kpp-section-title',
                          children: `2. Provider Routing (${filteredProviders.length}/${providers.length})`
                        }),
                        jsxs('div', {
                          style: { display: 'flex', alignItems: 'center', gap: '6px', width: '260px', maxWidth: '100%' },
                          children: [
                            jsx('input', {
                              type: 'text',
                              className: 'kpp-input',
                              placeholder: 'Search provider by name or host...',
                              'aria-label': 'Search provider by name or host',
                              value: providerSearch,
                              onChange: (e) => setProviderSearch(e.target.value)
                            }),
                            providerSearch
                              ? jsx('button', {
                                  type: 'button',
                                  className: 'kpp-btn kpp-btn-sm',
                                  title: 'Clear search',
                                  onClick: () => setProviderSearch(''),
                                  children: '✕'
                                })
                              : null
                          ]
                        })
                      ]
                    }),

                    conflicts.length > 0
                      ? jsxs('div', {
                          className: 'kpp-alert kpp-alert-warn',
                          children: [
                            jsx('div', {
                              style: { fontWeight: 600, marginBottom: '4px' },
                              children: '⚠ Domain / Host Routing Conflict Detected'
                            }),
                            ...conflicts.map((c) =>
                              jsx(
                                'div',
                                {
                                  children: `Host "${c.host}" is shared by [${c.providers
                                    .map((p) => `${p.providerName}: ${p.profileName}`)
                                    .join(', ')}]. Active proxy "${c.appliedProfileName}" is applied to all requests to ${c.host}.`
                                },
                                c.host
                              )
                            )
                          ]
                        })
                      : null,

                    filteredProviders.length === 0
                      ? jsx('div', {
                          className: 'kpp-host-sub',
                          children: `No providers matching "${providerSearch.trim()}".`
                        })
                      : jsx('div', {
                          className: 'kpp-list',
                          children: filteredProviders.map((prov) => {
                            const boundId = bindings[prov.id] || '';
                            return jsxs(
                              'div',
                              {
                                className: 'kpp-row',
                                children: [
                                  jsxs('div', {
                                    children: [
                                      jsxs('div', {
                                        style: { display: 'flex', alignItems: 'center', gap: '6px' },
                                        children: [
                                          jsx('span', {
                                            style: { fontWeight: 600, fontSize: '13px' },
                                            children: prov.name
                                          }),
                                          prov.custom
                                            ? jsx('span', {
                                                className: 'kpp-badge kpp-badge-direct',
                                                children: 'Custom'
                                              })
                                            : null
                                        ]
                                      }),
                                      jsx('div', {
                                        className: 'kpp-host-sub',
                                        children:
                                          prov.hosts && prov.hosts.length > 0
                                            ? `Hosts: ${prov.hosts.join(', ')}`
                                            : `Provider ID: ${prov.id}`
                                      })
                                    ]
                                  }),
                                  jsx(KppSelect, {
                                    ariaLabel: `Route for ${prov.name}`,
                                    value: boundId,
                                    options: routingOptions,
                                    onChange: (nextVal) => store.bindProvider(prov.id, nextVal || null)
                                  })
                                ]
                              },
                              prov.id
                            );
                          })
                        })
                  ]
                })
}
