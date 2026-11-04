import en from './en.js'
import ru from './ru.js'

export const locales = Object.freeze({ en, ru })

export function resolveLocale(choice = 'auto', hostLocale) {
  if (choice === 'ru' || choice === 'en') return choice
  const host = hostLocale || (typeof document !== 'undefined' ? document.documentElement.lang : '')
  return String(host).toLowerCase().startsWith('ru') ? 'ru' : 'en'
}
