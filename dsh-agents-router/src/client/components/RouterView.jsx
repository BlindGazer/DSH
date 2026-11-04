import { useCallback, useEffect, useRef, useState } from 'react'
import { KpiStrip } from './KpiStrip.jsx'
import { RouterHeader } from './RouterHeader.jsx'
import { MemoryWorksetTab } from './MemoryWorksetTab.jsx'
import { CatalogTab } from './CatalogTab.jsx'
import { DiagnosticsTab } from './DiagnosticsTab.jsx'
import { AuditProjectTab } from './AuditProjectTab.jsx'
import { cleanNameList } from './name-list.js'
import { locales, resolveLocale } from '../locales/index.js'
import { getHostLocale } from '../locale-context.js'
import { useEffectiveTheme } from '../theme/useEffectiveTheme.js'
import { themeStyles } from '../theme/styles.js'
import { request } from '../api.js'
import { routerStyles as styles } from './router-styles.js'
import { GlobalSettingsCard } from './GlobalSettingsCard.jsx'

const TAB_KEYS = ['memory', 'catalog', 'diagnostics', 'auditProject']
export function RouterView({ sessionId }) {
  const rootRef = useRef(null)
  const requestRef = useRef(false)
  const [data, setData] = useState()
  const [settings, setSettings] = useState()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('memory')
  const [filter, setFilter] = useState('all')
  const [path, setPath] = useState('')
  const [inspectPath, setInspectPath] = useState('')
  const [diagnosis, setDiagnosis] = useState()
  const [auditText, setAuditText] = useState('')
  const [notice, setNotice] = useState('')
  const [hostVisible, setHostVisible] = useState(false)
  const [slowPoll, setSlowPoll] = useState(false)
  const [points, setPoints] = useState([])
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
  const effectiveTheme = useEffectiveTheme(data?.globalSettings?.theme ?? 'auto', rootRef)

  const load = useCallback(async (silent = false) => {
    if (requestRef.current) return false
    requestRef.current = true
    if (!silent) setBusy(true)
    setError('')
    try {
      const body = await request(`/state?sessionId=${encodeURIComponent(sessionId)}`, { headers: { accept: 'application/json' } })
      setData(body)
      setSettings(body.settings)
      setSlowPoll(false)
      setPoints((current) => [...current, { label: new Date().toLocaleTimeString(), tokens: body.metrics.estimatedTokens }].slice(-30))
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setSlowPoll(true)
      return false
    } finally {
      requestRef.current = false
      if (!silent) setBusy(false)
    }
  }, [sessionId])

  const post = useCallback(async (route, body = {}) => request(`/${route}`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sessionId, ...body }),
  }), [sessionId])

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await load(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const syncVisibility = () => {
      const element = rootRef.current
      const style = element ? getComputedStyle(element) : undefined
      setHostVisible(Boolean(element && document.visibilityState === 'visible' && document.hasFocus()
        && style?.display !== 'none' && style?.visibility !== 'hidden' && !element.closest('[hidden], [aria-hidden="true"]')
        && element.offsetWidth > 0 && element.offsetHeight > 0))
    }
    const observer = new MutationObserver(syncVisibility)
    for (let element = rootRef.current; element; element = element.parentElement) {
      observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] })
    }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(syncVisibility)
    if (rootRef.current) resizeObserver?.observe(rootRef.current)
    document.addEventListener('visibilitychange', syncVisibility)
    window.addEventListener('focus', syncVisibility)
    window.addEventListener('blur', syncVisibility)
    syncVisibility()
    return () => {
      observer.disconnect()
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', syncVisibility)
      window.removeEventListener('focus', syncVisibility)
      window.removeEventListener('blur', syncVisibility)
    }
  }, [])

  const pollInterval = data?.globalSettings?.pollingIntervalMs ?? 3000
  useEffect(() => {
    if (tab !== 'memory' || !hostVisible) return undefined
    let cancelled = false
    let timer
    const poll = async () => {
      const ok = await load(true)
      if (!cancelled) timer = setTimeout(poll, ok ? pollInterval : 10000)
    }
    void poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [tab, hostVisible, load, pollInterval])

  useEffect(() => {
    if (tab !== 'auditProject') return
    let cancelled = false
    request(`/audit?sessionId=${encodeURIComponent(sessionId)}`, { headers: { accept: 'application/json' } })
      .then((body) => { if (!cancelled) setAuditText(body.text) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)) })
    return () => { cancelled = true }
  }, [tab, sessionId, data?.settings?.projectLogging, data?.globalSettings?.globalLogging])

  if (!data || !settings) return <main ref={rootRef} className="ar-root" data-theme={effectiveTheme}><style>{`${styles}${themeStyles}`}</style><h2>Router</h2><p role="status">{error || 'Loading...'}</p></main>

  const locale = resolveLocale(data.globalSettings.locale, getHostLocale())
  const t = (key) => locales[locale][key] ?? key
  const activeRules = data.rules.filter((rule) => rule.selected)
  const matched = activeRules.filter((rule) => !rule.appliesTo.includes('always'))
  const always = activeRules.filter((rule) => rule.appliesTo.includes('always'))
  const lastPoint = points.at(-1)?.tokens ?? data.metrics.estimatedTokens
  const percent = data.metrics.tokenBudget ? (lastPoint / data.metrics.tokenBudget) * 100 : 0
  const pollActive = tab === 'memory' && hostVisible

  const updateProject = (key, value) => setSettings((current) => ({ ...current, [key]: value }))
  const updateCategory = (key, value) => setSettings((current) => ({ ...current, logCategories: { ...current.logCategories, [key]: value } }))
  const saveProject = (event) => {
    event.preventDefault()
    return run(async () => {
      const result = await post('settings', { settings: {
        ...settings,
        tokenBudget: Number(settings.tokenBudget),
        rootInstructionFileNames: cleanNameList(settings.rootInstructionFileNames),
        instructionDirectoryNames: cleanNameList(settings.instructionDirectoryNames),
      } })
      setSettings(result.settings)
      setNotice(t('saved'))
    })
  }
  const addPath = (event) => {
    event.preventDefault()
    if (!path.trim()) return
    const value = path.trim()
    void run(async () => { await post('workset', { action: 'add', path: value }); setPath('') })
  }
  const inspect = (event) => {
    event.preventDefault()
    if (!inspectPath.trim()) return
    void run(async () => setDiagnosis(await post('diagnose', { path: inspectPath.trim() })))
  }
  const clearLog = () => void run(async () => {
    await post('audit/delete')
    setAuditText('')
    setNotice(t('deleted'))
  })
  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(auditText)
      setNotice(t('copied'))
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }

  return (
    <main ref={rootRef} className="ar-root" data-theme={effectiveTheme}>
      <style>{`${styles}${themeStyles}`}</style>
      <RouterHeader data={data} t={t} pollActive={pollActive} slowPoll={slowPoll} pollInterval={pollInterval} busy={busy} run={run} post={post} onSettings={() => setShowGlobalSettings(true)} />
      {error ? <p className="ar-error" role="alert">{error}</p> : null}
      {data.auditWarning ? <p className="ar-warning" role="status">{data.auditWarning}</p> : null}
      <KpiStrip data={data} t={t} lastPoint={lastPoint} percent={percent} />
      <nav className="ar-tabs" role="tablist" aria-label={t('router')}>
        {TAB_KEYS.map((key, index) => <button key={key} role="tab" aria-selected={tab === key} className={`ar-tab-btn${tab === key ? ' selected' : ''}`} onClick={() => setTab(key)}>{t(key)}{index === 1 ? ` (${data.rules.length})` : index === 2 ? ` (${data.diagnostics.length})` : ''}</button>)}
      </nav>

      {tab === 'memory' ? <MemoryWorksetTab data={data} t={t} points={points} path={path} setPath={setPath} addPath={addPath} busy={busy} run={run} post={post} activeRules={activeRules} matched={matched} always={always} /> : null}

      {tab === 'catalog' ? <CatalogTab data={data} t={t} filter={filter} setFilter={setFilter} /> : null}

      {tab === 'diagnostics' ? <DiagnosticsTab data={data} t={t} inspect={inspect} inspectPath={inspectPath} setInspectPath={setInspectPath} busy={busy} diagnosis={diagnosis} /> : null}

      {tab === 'auditProject' ? <AuditProjectTab data={data} t={t} auditText={auditText} copyLog={copyLog} clearLog={clearLog} settings={settings} updateCategory={updateCategory} updateProject={updateProject} saveProject={saveProject} notice={notice} busy={busy} /> : null}

      {showGlobalSettings ? <div className="ar-modal" role="dialog" aria-modal="true" aria-label={t('globalSettings')}><GlobalSettingsCard isModal onClose={() => setShowGlobalSettings(false)} /></div> : null}
    </main>
  )
}

