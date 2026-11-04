function ProfileCredentialsFields({ editingDraft, setEditingDraft, showPassword, setShowPassword }) {
  return jsxs('div', {
                                  className: 'kpp-grid-2',
                                  children: [
                                    jsxs('label', {
                                      className: 'kpp-field',
                                      children: [
                                        jsx('span', {
                                          className: 'kpp-label',
                                          children: editingDraft.hasCredentials
                                            ? `Username (saved: ${editingDraft.usernameMask || 'yes'})`
                                            : 'Username'
                                        }),
                                        jsx('input', {
                                          type: 'text',
                                          className: 'kpp-input',
                                          placeholder: editingDraft.hasCredentials
                                            ? 'Leave blank to keep saved username'
                                            : 'Enter username',
                                          value: editingDraft.username,
                                          onChange: (e) =>
                                            setEditingDraft({
                                              ...editingDraft,
                                              username: e.target.value
                                            })
                                        })
                                      ]
                                    }),
                                    jsxs('div', {
                                      className: 'kpp-field',
                                      children: [
                                        jsx('span', {
                                          className: 'kpp-label',
                                          children: editingDraft.hasCredentials
                                            ? 'Password (saved encrypted)'
                                            : 'Password'
                                        }),
                                        jsxs('div', {
                                          style: { display: 'flex', gap: '6px' },
                                          children: [
                                            jsx('input', {
                                              type: showPassword ? 'text' : 'password',
                                              className: 'kpp-input',
                                              placeholder: editingDraft.hasCredentials
                                                ? 'Leave blank to keep saved password'
                                                : 'Enter password',
                                              value: editingDraft.password,
                                              onChange: (e) =>
                                                setEditingDraft({
                                                  ...editingDraft,
                                                  password: e.target.value
                                                })
                                            }),
                                            jsx('button', {
                                              type: 'button',
                                              className: 'kpp-btn kpp-btn-sm',
                                              onClick: () => setShowPassword(!showPassword),
                                              children: showPassword ? 'Hide' : 'Show'
                                            })
                                          ]
                                        })
                                      ]
                                    })
                                  ]
                                })
}
