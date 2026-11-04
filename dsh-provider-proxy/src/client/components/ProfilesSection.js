function ProfilesSection(props) {
  const {
    profiles, editingDraft, isNewDraft, startAddProfile, deleteConfirmProfile,
    saving, performDeleteProfile, setDeleteConfirmProfile, startEditProfile,
    requestDeleteProfile, formError, showPassword, setEditingDraft,
    setShowPassword, testUrl, setTestUrl, sanitizeHost, testing,
    handleRunTest, testResult, cancelEditProfile, handleSaveDraft,
    KppSelect, DEFAULT_TEST_URL
  } = props
  return jsxs('div', {
                  className: 'kpp-section',
                  children: [
                    jsxs('div', {
                      className: 'kpp-section-head',
                      children: [
                        jsx('h3', {
                          className: 'kpp-section-title',
                          children: '1. Proxy Profiles'
                        }),
                        !editingDraft
                          ? jsx('button', {
                              type: 'button',
                              className: 'kpp-btn kpp-btn-primary kpp-btn-sm',
                              onClick: startAddProfile,
                              children: '+ Add Profile'
                            })
                          : null
                      ]
                    }),

                    deleteConfirmProfile
                      ? jsxs('div', {
                          className: 'kpp-alert kpp-alert-warn',
                          children: [
                            jsx('div', {
                              children: `Profile "${deleteConfirmProfile.profile.name}" is currently assigned to: ${deleteConfirmProfile.affectedProviders.join(', ')}. Deleting it will reset those providers to Direct (No proxy).`
                            }),
                            jsxs('div', {
                              style: { display: 'flex', gap: '8px', marginTop: '8px' },
                              children: [
                                jsx('button', {
                                  type: 'button',
                                  className: 'kpp-btn kpp-btn-danger kpp-btn-sm',
                                  disabled: saving,
                                  onClick: () => performDeleteProfile(deleteConfirmProfile.profile.id),
                                  children: 'Confirm Delete & Reset to Direct'
                                }),
                                jsx('button', {
                                  type: 'button',
                                  className: 'kpp-btn kpp-btn-sm',
                                  onClick: () => setDeleteConfirmProfile(null),
                                  children: 'Cancel'
                                })
                              ]
                            })
                          ]
                        })
                      : null,

                    profiles.length === 0 && !editingDraft
                      ? jsx('div', {
                          className: 'kpp-host-sub',
                          children: 'No proxy profiles created yet. Click "+ Add Profile" to configure HTTP, HTTPS, or SOCKS5 proxy.'
                        })
                      : jsx('div', {
                          className: 'kpp-list',
                          children: profiles.map((p) =>
                            jsxs(
                              'div',
                              {
                                className: 'kpp-row',
                                children: [
                                  jsxs('div', {
                                    children: [
                                      jsx('div', {
                                        style: { fontWeight: 600, fontSize: '13px' },
                                        children: p.name
                                      }),
                                      jsx('div', {
                                        className: 'kpp-host-sub',
                                        children: `${p.protocol.toUpperCase()}://${p.host}:${p.port}${
                                          p.auth?.enabled
                                            ? ` • Auth (${p.auth.usernameMask || 'encrypted'})`
                                            : ''
                                        }${p.ignoreSslErrors ? ' • Ignore SSL Errors' : ''}`
                                      })
                                    ]
                                  }),
                                  jsxs('div', {
                                    style: { display: 'flex', gap: '6px' },
                                    children: [
                                      jsx('button', {
                                        type: 'button',
                                        className: 'kpp-btn kpp-btn-sm',
                                        onClick: () => startEditProfile(p),
                                        children: 'Edit'
                                      }),
                                      jsx('button', {
                                        type: 'button',
                                        className: 'kpp-btn kpp-btn-danger kpp-btn-sm',
                                        onClick: () => requestDeleteProfile(p),
                                        children: 'Delete'
                                      })
                                    ]
                                  })
                                ]
                              },
                              p.id
                            )
                          )
                        }),

                    editingDraft ? jsx(ProfileEditor, props) : null,

                  ]
                })
}
