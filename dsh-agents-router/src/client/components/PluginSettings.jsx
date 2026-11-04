import { locales, resolveLocale } from '../locales/index.js'
import { getHostLocale } from '../locale-context.js'
import { PACKAGE_ID } from '../../shared/constants.js'

export function PluginSettingsAction({ subject }) {
  if (subject?.kind !== 'bundle' || subject.pkg?.name !== PACKAGE_ID) return null
  const locale = resolveLocale('auto', getHostLocale())
  const t = (key) => locales[locale][key] ?? key
  return <button className="ar-settings-jump" type="button" onClick={() => document.getElementById('agents-router-global-settings')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><span aria-hidden="true">&#x2699;</span>{t('settingsAction')}</button>
}

export { GlobalSettingsCard as PluginSettingsView } from './GlobalSettingsCard.jsx'
