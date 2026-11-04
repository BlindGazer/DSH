import test from 'node:test'
import assert from 'node:assert/strict'
import { locales, resolveLocale } from '../src/client/locales/index.js'

test('locale selection honors explicit language and detects host Russian preference', () => {
  assert.equal(resolveLocale('ru', 'en'), 'ru')
  assert.equal(resolveLocale('auto', 'ru-RU'), 'ru')
  assert.equal(resolveLocale('auto', 'en-US'), 'en')
  assert.equal(resolveLocale('auto', ''), 'en')
})

test('instruction redirection hint explains root-file and directory scope in both locales', () => {
  assert.match(locales.en.instructionRedirectionHint, /directly in the project root/)
  assert.match(locales.en.instructionRedirectionHint, /relative paths preserved/)
  assert.match(locales.ru.instructionRedirectionHint, /непосредственно из корня проекта/)
  assert.match(locales.ru.instructionRedirectionHint, /сохраняется относительный путь файла/)
})
