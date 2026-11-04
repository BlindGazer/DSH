function ImportExportSection(props) {
  const {
    placement, fileInputRef, exportWithCreds, setExportWithCreds,
    setExportPasswordPromptOpen, handleExportClick, onClose, snap, ioNotice,
    exportPasswordPromptOpen, exportPassword, setExportPassword,
    handleConfirmEncryptedExport, pendingImportPayload, importPassword,
    setImportPassword, handleConfirmEncryptedImport, setPendingImportPayload
  } = props

  if (placement === 'header') {
    return jsxs(Fragment, {
      children: [
        jsx('input', {
          ref: fileInputRef, type: 'file', accept: '.json,application/json',
          style: { display: 'none' }, onChange: props.handleImportFileChange
        }),
        jsxs('div', {
          style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
          children: [
            jsxs('label', {
              className: 'kpp-checkbox-row',
              style: { fontSize: '12px', marginRight: '2px' },
              title: 'When checked, Export will ask for a password and include encrypted login & password for portable transfer to another computer',
              children: [
                jsx('input', {
                  type: 'checkbox', checked: exportWithCreds,
                  onChange: (event) => {
                    setExportWithCreds(event.target.checked)
                    if (!event.target.checked) setExportPasswordPromptOpen(false)
                  }
                }),
                jsx('span', { children: 'Include credentials' })
              ]
            }),
            jsx('button', {
              type: 'button', className: 'kpp-btn kpp-btn-sm', onClick: handleExportClick,
              title: exportWithCreds ? 'Export proxy settings and password-encrypted credentials' : 'Export proxy settings without credentials',
              children: 'Export'
            }),
            jsx('button', {
              type: 'button', className: 'kpp-btn kpp-btn-sm',
              onClick: () => fileInputRef.current?.click?.(),
              title: 'Import proxy profiles and routing from JSON file', children: 'Import'
            })
          ]
        })
      ]
    })
  }

  return jsxs(Fragment, {
    children: [
      snap.error ? jsx('div', { className: 'kpp-alert kpp-alert-err', children: snap.error }) : null,
      ioNotice ? jsx('div', {
        className: ioNotice.ok ? 'kpp-alert kpp-alert-ok' : 'kpp-alert kpp-alert-err',
        children: ioNotice.text
      }) : null,
      exportPasswordPromptOpen ? jsxs('div', {
        className: 'kpp-form',
        children: [
          jsx('div', { style: { fontWeight: 600, fontSize: '13px' }, children: 'Encrypt Credentials for Portable Export' }),
          jsx('div', { className: 'kpp-host-sub', children: 'Enter a password to encrypt login & password (AES-256-GCM) so they can be imported on another computer:' }),
          jsxs('div', {
            style: { display: 'flex', gap: '8px', alignItems: 'center' },
            children: [
              jsx('input', {
                type: 'password', className: 'kpp-input', placeholder: 'Enter encryption password...',
                value: exportPassword, onChange: (event) => setExportPassword(event.target.value)
              }),
              jsx('button', { type: 'button', className: 'kpp-btn kpp-btn-primary', onClick: handleConfirmEncryptedExport, children: 'Download Export' }),
              jsx('button', {
                type: 'button', className: 'kpp-btn',
                onClick: () => { setExportPasswordPromptOpen(false); setExportPassword('') },
                children: 'Cancel'
              })
            ]
          })
        ]
      }) : null,
      pendingImportPayload ? jsxs('div', {
        className: 'kpp-form',
        children: [
          jsx('div', { style: { fontWeight: 600, fontSize: '13px' }, children: 'Encrypted Credentials Detected in Import File' }),
          jsx('div', { className: 'kpp-host-sub', children: 'Enter the password used when exporting this file to decrypt and restore login & password:' }),
          jsxs('div', {
            style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
            children: [
              jsx('input', {
                type: 'password', className: 'kpp-input', style: { flex: '1 1 200px' },
                placeholder: 'Enter decryption password...', value: importPassword,
                onChange: (event) => setImportPassword(event.target.value)
              }),
              jsx('button', { type: 'button', className: 'kpp-btn kpp-btn-primary', onClick: () => handleConfirmEncryptedImport(false), children: 'Decrypt & Import' }),
              jsx('button', { type: 'button', className: 'kpp-btn', onClick: () => handleConfirmEncryptedImport(true), children: 'Import Without Credentials' }),
              jsx('button', {
                type: 'button', className: 'kpp-btn',
                onClick: () => { setPendingImportPayload(null); setImportPassword('') },
                children: 'Cancel'
              })
            ]
          })
        ]
      }) : null
    ]
  })
}
