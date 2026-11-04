function ProxySettingsModal({ open, onClose }) {
  const effectiveTheme = useEffectiveTheme()
  const snap = useProxyStore()
  const profileActions = useProfileActions({ store, snap })
  const importExport = useImportExportHandlers({
    store,
    setEditingDraft: profileActions.setEditingDraft
  })
  const [providerSearch, setProviderSearch] = useState('')

  useEffect(() => {
    if (!open) return
    store.refresh()
    profileActions.resetForOpen()
    importExport.resetForOpen()
  }, [open])

  if (!open) return null

  return jsx('div', {
    className: 'kpp-modal-backdrop',
    'data-theme': effectiveTheme,
    children: jsxs('div', {
      className: 'kpp-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Proxy settings',
      children: [
        jsxs('div', {
          className: 'kpp-modal-header',
          children: [
            jsx('h2', { className: 'kpp-modal-title', children: 'Proxy settings' }),
            jsx(ImportExportSection, { placement: 'header', ...importExport }),
            jsx('button', {
              type: 'button', className: 'kpp-btn kpp-btn-sm', onClick: onClose,
              children: 'Close'
            })
          ]
        }),
        jsxs('div', {
          className: 'kpp-modal-body',
          children: [
            jsx(ImportExportSection, { placement: 'body', snap, ...importExport }),
            jsx(ProfilesSection, {
              ...profileActions, KppSelect, DEFAULT_TEST_URL, sanitizeHost
            }),
            jsx(RoutingSection, {
              providers: profileActions.providers,
              profiles: profileActions.profiles,
              bindings: profileActions.bindings,
              conflicts: profileActions.conflicts,
              providerSearch,
              setProviderSearch,
              store,
              KppSelect
            })
          ]
        })
      ]
    })
  })
}
