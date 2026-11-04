function useImportExportHandlers({ store, setEditingDraft }) {
  const [ioNotice, setIoNotice] = useState(null)
  const [exportWithCreds, setExportWithCreds] = useState(false)
  const [exportPasswordPromptOpen, setExportPasswordPromptOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [pendingImportPayload, setPendingImportPayload] = useState(null)
  const [importPassword, setImportPassword] = useState('')
  const fileInputRef = useRef ? useRef(null) : { current: null }

  const resetForOpen = () => {
    setIoNotice(null)
    setExportPasswordPromptOpen(false)
    setExportPassword('')
    setPendingImportPayload(null)
    setImportPassword('')
  }

  const triggerDownloadJson = (exportData, withCreds) => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'kalex-provider-proxy-settings.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIoNotice({
      ok: true,
      text: withCreds
        ? 'Settings and password-encrypted credentials exported to kalex-provider-proxy-settings.json'
        : 'Proxy settings (without credentials) exported to kalex-provider-proxy-settings.json'
    })
  }

  const handleExportClick = async () => {
    setIoNotice(null)
    setPendingImportPayload(null)
    if (exportWithCreds) {
      setExportPassword('')
      setExportPasswordPromptOpen(true)
      return
    }
    try {
      const exportData = await store.exportConfig({ includeCredentials: false })
      triggerDownloadJson(exportData, false)
    } catch (err) {
      setIoNotice({ ok: false, text: err?.message || 'Failed to export settings' })
    }
  }

  const handleConfirmEncryptedExport = async () => {
    if (!exportPassword) {
      setIoNotice({ ok: false, text: 'Please enter a password to encrypt credentials.' })
      return
    }
    setIoNotice(null)
    try {
      const exportData = await store.exportConfig({
        includeCredentials: true,
        password: exportPassword
      })
      setExportPasswordPromptOpen(false)
      setExportPassword('')
      triggerDownloadJson(exportData, true)
    } catch (err) {
      setIoNotice({ ok: false, text: err?.message || 'Failed to export encrypted settings' })
    }
  }

  const handleImportFileChange = async (event) => {
    const file = event.target?.files?.[0]
    if (event.target) event.target.value = ''
    if (!file) return
    setIoNotice(null)
    setExportPasswordPromptOpen(false)
    try {
      const parsed = JSON.parse(await file.text())
      const candidateProfiles = parsed?.profiles || parsed?.config?.profiles || []
      const hasEncryptedCreds = Boolean(parsed?.encryptedCredentials) ||
        (Array.isArray(candidateProfiles) && candidateProfiles.some((profile) =>
          typeof profile?.auth?.exportCipher === 'string' && profile.auth.exportCipher.length > 0
        ))

      if (hasEncryptedCreds) {
        setPendingImportPayload(parsed)
        setImportPassword('')
        return
      }

      await store.importConfig(parsed)
      setEditingDraft(null)
      setIoNotice({ ok: true, text: `Imported ${candidateProfiles.length} profile(s) successfully.` })
    } catch (err) {
      setIoNotice({ ok: false, text: err?.message || 'Invalid JSON file for proxy settings import' })
    }
  }

  const handleConfirmEncryptedImport = async (skipCredentials = false) => {
    if (!pendingImportPayload) return
    if (!skipCredentials && !importPassword) {
      setIoNotice({ ok: false, text: 'Please enter the password to decrypt imported credentials.' })
      return
    }
    setIoNotice(null)
    try {
      await store.importConfig(pendingImportPayload, {
        password: importPassword,
        skipCredentials
      })
      const count = (pendingImportPayload?.profiles || pendingImportPayload?.config?.profiles || []).length
      setPendingImportPayload(null)
      setImportPassword('')
      setEditingDraft(null)
      setIoNotice({
        ok: true,
        text: skipCredentials
          ? `Imported ${count} profile(s) without credentials.`
          : `Imported ${count} profile(s) with decrypted credentials.`
      })
    } catch (err) {
      setIoNotice({ ok: false, text: err?.message || 'Failed to decrypt and import proxy settings' })
    }
  }

  return {
    ioNotice, exportWithCreds, setExportWithCreds,
    exportPasswordPromptOpen, setExportPasswordPromptOpen,
    exportPassword, setExportPassword, pendingImportPayload,
    setPendingImportPayload, importPassword, setImportPassword,
    fileInputRef, resetForOpen, handleExportClick,
    handleConfirmEncryptedExport, handleImportFileChange,
    handleConfirmEncryptedImport
  }
}
