function ProfileEditor(props) {
  const {
    editingDraft, isNewDraft, formError, setEditingDraft, showPassword,
    setShowPassword, testUrl, setTestUrl, sanitizeHost, testing,
    handleRunTest, testResult, cancelEditProfile, handleSaveDraft, saving,
    KppSelect, DEFAULT_TEST_URL
  } = props
  return jsxs('div', {
                          className: 'kpp-form',
                          children: [
                            jsx('div', {
                              style: { fontWeight: 600, fontSize: '13px' },
                              children: isNewDraft ? 'Create Proxy Profile' : `Edit Profile: ${editingDraft.name}`
                            }),
                            formError
                              ? jsx('div', { className: 'kpp-alert kpp-alert-err', children: formError })
                              : null,
                            jsxs('div', {
                              className: 'kpp-grid',
                              children: [
                                jsxs('label', {
                                  className: 'kpp-field',
                                  children: [
                                    jsx('span', { className: 'kpp-label', children: 'Profile Name' }),
                                    jsx('input', {
                                      type: 'text',
                                      className: 'kpp-input',
                                      placeholder: 'e.g. Corporate Proxy',
                                      value: editingDraft.name,
                                      onChange: (e) =>
                                        setEditingDraft({ ...editingDraft, name: e.target.value })
                                    })
                                  ]
                                }),
                                jsxs('div', {
                                  className: 'kpp-field',
                                  children: [
                                    jsx('span', { className: 'kpp-label', children: 'Protocol' }),
                                    jsx(KppSelect, {
                                      ariaLabel: 'Protocol',
                                      fullWidth: true,
                                      value: editingDraft.protocol,
                                      options: [
                                        { value: 'http', label: 'HTTP' },
                                        { value: 'https', label: 'HTTPS' },
                                        { value: 'socks5', label: 'SOCKS5' }
                                      ],
                                      onChange: (nextProto) =>
                                        setEditingDraft({ ...editingDraft, protocol: nextProto })
                                    })
                                  ]
                                }),
                                jsxs('label', {
                                  className: 'kpp-field',
                                  children: [
                                    jsx('span', { className: 'kpp-label', children: 'Port (1–65535)' }),
                                    jsx('input', {
                                      type: 'number',
                                      min: 1,
                                      max: 65535,
                                      className: 'kpp-input',
                                      placeholder: '8080',
                                      value: editingDraft.port,
                                      onChange: (e) =>
                                        setEditingDraft({ ...editingDraft, port: e.target.value })
                                    })
                                  ]
                                })
                              ]
                            }),
                            jsxs('label', {
                              className: 'kpp-field',
                              children: [
                                jsx('span', {
                                  className: 'kpp-label',
                                  children: 'Host (IP or domain, scheme stripped automatically)'
                                }),
                                jsx('input', {
                                  type: 'text',
                                  className: 'kpp-input',
                                  placeholder: 'proxy.corp.local or 127.0.0.1',
                                  value: editingDraft.host,
                                  onChange: (e) =>
                                    setEditingDraft({
                                      ...editingDraft,
                                      host: sanitizeHost(e.target.value)
                                    })
                                })
                              ]
                            }),
                            jsxs('label', {
                              className: 'kpp-checkbox-row',
                              children: [
                                jsx('input', {
                                  type: 'checkbox',
                                  checked: editingDraft.authEnabled,
                                  onChange: (e) =>
                                    setEditingDraft({
                                      ...editingDraft,
                                      authEnabled: e.target.checked
                                    })
                                }),
                                jsx('span', { children: 'Requires authentication (Basic / SOCKS5 Username & Password)' })
                              ]
                            }),
                            editingDraft.authEnabled
                              ? jsx(ProfileCredentialsFields, { editingDraft, setEditingDraft, showPassword, setShowPassword })
                              : null,
                            jsxs('label', {
                              className: 'kpp-checkbox-row',
                              children: [
                                jsx('input', {
                                  type: 'checkbox',
                                  checked: editingDraft.ignoreSslErrors,
                                  onChange: (e) =>
                                    setEditingDraft({
                                      ...editingDraft,
                                      ignoreSslErrors: e.target.checked
                                    })
                                }),
                                jsx('span', {
                                  children: 'Ignore SSL / TLS certificate errors (rejectUnauthorized: false)'
                                })
                              ]
                            }),

                            // Test Connection Block
                            jsxs('div', {
                              style: {
                                paddingTop: '8px',
                                borderTop: '1px solid var(--dsh-ui-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              },
                              children: [
                                jsx('span', {
                                  className: 'kpp-label',
                                  children: 'Test Connection (5000ms TCP + HTTP check)'
                                }),
                                jsxs('div', {
                                  style: { display: 'flex', gap: '8px' },
                                  children: [
                                    jsx('input', {
                                      type: 'text',
                                      className: 'kpp-input',
                                      placeholder: DEFAULT_TEST_URL,
                                      value: testUrl,
                                      onChange: (e) => setTestUrl(e.target.value)
                                    }),
                                    jsx('button', {
                                      type: 'button',
                                      className: 'kpp-btn',
                                      disabled: testing,
                                      onClick: handleRunTest,
                                      children: testing ? 'Testing...' : 'Test'
                                    })
                                  ]
                                }),
                                testResult
                                  ? jsx('div', {
                                      className: testResult.ok
                                        ? 'kpp-alert kpp-alert-ok'
                                        : 'kpp-alert kpp-alert-err',
                                      children: testResult.ok
                                        ? `✓ Proxy reachable! TCP OK (${testResult.tcpLatencyMs ?? 0}ms) • Target HTTP ${
                                            testResult.status ?? 'OK'
                                          } (${testResult.latencyMs ?? 0}ms)`
                                        : `✕ ${testResult.error || 'Connection test failed'}${
                                            testResult.tcpOk
                                              ? ` (TCP connected in ${testResult.tcpLatencyMs ?? 0}ms, HTTP stage failed)`
                                              : ''
                                          }`
                                    })
                                  : null
                              ]
                            }),

                            jsxs('div', {
                              style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' },
                              children: [
                                jsx('button', {
                                  type: 'button',
                                  className: 'kpp-btn',
                                  onClick: cancelEditProfile,
                                  children: 'Cancel'
                                }),
                                jsx('button', {
                                  type: 'button',
                                  className: 'kpp-btn kpp-btn-primary',
                                  disabled: saving,
                                  onClick: handleSaveDraft,
                                  children: saving ? 'Saving...' : 'Save Profile'
                                })
                              ]
                            })
                          ]
                        })
}
