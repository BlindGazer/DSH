import { useEffect, useRef, useState } from 'react'
import { ThemedSelect } from './ThemedSelect.jsx'
import { SwitchControl } from './SwitchControl.jsx'
import { locales, resolveLocale } from '../locales/index.js'
import { getHostLocale } from '../locale-context.js'
import { useEffectiveTheme } from '../theme/useEffectiveTheme.js'
import { themeStyles } from '../theme/styles.js'
import { request } from '../api.js'
import { settingsStyles } from './router-styles.js'

export function GlobalSettingsCard({ isModal = false, onClose }) {
  const rootRef = useRef(null)
  const [settings, setSettings] = useState()
  const effectiveTheme = useEffectiveTheme(settings?.theme ?? 'auto', rootRef)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    request('/global-settings', { headers: { accept: 'application/json' } }).then((result) => {
      if (!cancelled) setSettings(result.settings)
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)) })
    return () => { cancelled = true }
  }, [])
  if (!settings) return <div ref={rootRef} className="ar-settings-root" data-theme={effectiveTheme}><style>{`${settingsStyles}${themeStyles}`}</style><section id="agents-router-global-settings" className="ar-settings-card"><h2>Router</h2><p role="status">{error || 'Loading...'}</p></section></div>
  const locale = resolveLocale(settings.locale, getHostLocale())
  const t = (key) => locales[locale][key] ?? key
  const update = (key, value) => { setSettings((current) => ({ ...current, [key]: value })); setNotice('') }
  const resetDefaults = () => {
    setSettings({ locale: 'auto', theme: 'auto', pollingIntervalMs: 3000, globalLogging: false })
    setNotice('')
  }
  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await request('/global-settings', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ settings }) })
      setSettings(result.settings)
      setNotice(t('saved'))
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }
  return <div ref={rootRef} className="ar-settings-root" data-theme={effectiveTheme}>
    <style>{`${settingsStyles}${themeStyles}`}</style>
    <section id="agents-router-global-settings" className="ar-settings-card" aria-label={t('globalSettings')}>
      <div className="ar-settings-heading">
        <div><h2>{t('globalSettings')}</h2><p>{t('settingsStorage')}</p></div>
        <div className="ar-settings-header-right"><span className="ar-settings-scope">{t('globalScope')}</span>{isModal ? <button type="button" className="ar-btn ar-btn-sm" onClick={onClose}>&#x2715; {t('close')}</button> : null}</div>
      </div>
      <form onSubmit={save}>
        <div className="ar-settings-row"><span className="ar-settings-copy"><strong>{t('locale')}</strong><small>{t('localeHint')}</small></span>
          <ThemedSelect ariaLabel={t('locale')} value={settings.locale} disabled={busy} onChange={(value) => update('locale', value)} options={[{ value: 'auto', label: t('autoDsh') }, { value: 'ru', label: t('russian') }, { value: 'en', label: t('english') }]} />
        </div>
        <div className="ar-settings-row"><span className="ar-settings-copy"><strong>{t('theme')}</strong><small>{t('themeHint')}</small></span>
          <ThemedSelect ariaLabel={t('theme')} value={settings.theme} disabled={busy} onChange={(value) => update('theme', value)} options={[{ value: 'auto', label: t('autoTheme') }, { value: 'dark', label: t('dark') }, { value: 'light', label: t('light') }]} />
        </div>
        <div className="ar-settings-row"><span className="ar-settings-copy"><strong>{t('polling')}</strong><small>{t('pollingHint')}</small></span>
          <ThemedSelect ariaLabel={t('polling')} value={settings.pollingIntervalMs} disabled={busy} onChange={(value) => update('pollingIntervalMs', Number(value))} options={[2000, 3000, 5000, 10000].map((value) => ({ value, label: `${value / 1000} ${t('seconds')}` }))} />
        </div>
        <div className="ar-settings-row"><span className="ar-settings-copy"><strong id="ar-global-logging-label">{t('globalLogging')}</strong><small>{t('loggingHint')}</small></span>
          <SwitchControl labelledBy="ar-global-logging-label" checked={settings.globalLogging} disabled={busy} onChange={(checked) => update('globalLogging', checked)} /></div>
        <div className="ar-settings-footer"><div aria-live="polite">{error ? <span className="ar-settings-error" role="alert">{error}</span> : notice ? <span className="ar-settings-success">{notice}</span> : null}</div>
          <div className="ar-settings-buttons"><button className="ar-btn" type="button" disabled={busy} onClick={resetDefaults}>{t('resetDefaults')}</button><button className="ar-btn ar-settings-primary" type="submit" disabled={busy}>{t('save')}</button></div>
        </div>
      </form>
    </section>
  </div>
}

