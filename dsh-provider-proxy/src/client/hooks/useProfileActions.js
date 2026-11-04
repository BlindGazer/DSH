function useProfileActions({ store, snap }) {
  const [editingDraft, setEditingDraft] = useState(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testUrl, setTestUrl] = useState(snap.config?.defaultTestUrl || DEFAULT_TEST_URL)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [formError, setFormError] = useState(null)
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const profiles = snap.config?.profiles || []
  const bindings = snap.config?.providerBindings || {}
  const providers = snap.providers || []
  const conflicts = snap.conflicts || []

  const resetForOpen = () => {
    setFormError(null)
    setTestResult(null)
  }

  const startAddProfile = () => {
    setEditingDraft(createEmptyDraft())
    setIsNewDraft(true)
    setShowPassword(false)
    setFormError(null)
    setTestResult(null)
  }

  const startEditProfile = (profile) => {
    setEditingDraft(draftFromProfile(profile))
    setIsNewDraft(false)
    setShowPassword(false)
    setFormError(null)
    setTestResult(null)
  }

  const cancelEditProfile = () => {
    setEditingDraft(null)
    setFormError(null)
    setTestResult(null)
  }

  const handleSaveDraft = async () => {
    if (!editingDraft) return
    const candidate = profileFromDraft(editingDraft)
    if (!candidate.name) return setFormError('Profile Name is required.')
    if (!candidate.host) return setFormError('Valid proxy Host (IP or domain without scheme) is required.')
    if (!Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535) {
      setFormError('Port must be an integer between 1 and 65535.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const nextProfiles = isNewDraft
        ? [...profiles, candidate]
        : profiles.map((profile) => profile.id === candidate.id ? candidate : profile)
      await store.saveConfig({
        ...snap.config,
        profiles: nextProfiles,
        defaultTestUrl: testUrl || DEFAULT_TEST_URL
      })
      setEditingDraft(null)
      setTestResult(null)
    } catch (err) {
      setFormError(err?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const performDeleteProfile = async (profileId) => {
    setSaving(true)
    try {
      const nextProfiles = profiles.filter((profile) => profile.id !== profileId)
      const nextBindings = { ...bindings }
      for (const [providerId, boundProfileId] of Object.entries(nextBindings)) {
        if (boundProfileId === profileId) nextBindings[providerId] = null
      }
      await store.saveConfig({ ...snap.config, profiles: nextProfiles, providerBindings: nextBindings })
      setDeleteConfirmProfile(null)
      if (editingDraft?.id === profileId) setEditingDraft(null)
    } catch (err) {
      setFormError(err?.message || 'Failed to delete profile')
    } finally {
      setSaving(false)
    }
  }

  const requestDeleteProfile = (profile) => {
    const affectedProviders = Object.entries(bindings)
      .filter(([, profileId]) => profileId === profile.id)
      .map(([providerId]) => providers.find((provider) => provider.id === providerId)?.name || providerId)
    if (affectedProviders.length) setDeleteConfirmProfile({ profile, affectedProviders })
    else performDeleteProfile(profile.id)
  }

  const handleRunTest = async () => {
    if (!editingDraft) return
    const candidate = profileFromDraft(editingDraft)
    if (!candidate.host || !Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535) {
      setTestResult({
        ok: false, tcpOk: false, httpOk: false,
        error: 'Please enter a valid Host and Port (1–65535) before testing.'
      })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await store.testConnection(candidate, testUrl))
    } catch (err) {
      setTestResult({
        ok: false, tcpOk: false, httpOk: false,
        error: err?.message || 'Connection test request failed'
      })
    } finally {
      setTesting(false)
    }
  }

  return {
    profiles, bindings, providers, conflicts,
    editingDraft, setEditingDraft, isNewDraft, showPassword, setShowPassword,
    testUrl, setTestUrl, testing, testResult, formError,
    deleteConfirmProfile, setDeleteConfirmProfile, saving,
    resetForOpen, startAddProfile, startEditProfile, cancelEditProfile,
    handleSaveDraft, performDeleteProfile, requestDeleteProfile, handleRunTest
  }
}
