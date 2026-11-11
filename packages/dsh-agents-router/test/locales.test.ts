import { assert, test } from 'vitest';

import { locales, resolveLocale } from '../src/client/locales/index.js';

test('locale selection honors explicit language and detects host Russian preference', () => {
    assert.equal(resolveLocale('ru', 'en'), 'ru');
    assert.equal(resolveLocale('auto', 'ru-RU'), 'ru');
    assert.equal(resolveLocale('auto', 'en-US'), 'en');
    assert.equal(resolveLocale('auto', ''), 'en');
});

test('instruction redirection hint explains root-file and directory scope in both locales', () => {
    assert.match(locales.en.instructionRedirectionHint, /directly in the project root/);
    assert.match(locales.en.instructionRedirectionHint, /relative paths preserved/);
    assert.match(locales.ru.instructionRedirectionHint, /непосредственно из корня проекта/);
    assert.match(locales.ru.instructionRedirectionHint, /сохраняется относительный путь файла/);
});

test('Router global settings labels are translated in both supported locales', () => {
    assert.equal(locales.en.settingsAction, 'Settings');
    assert.equal(locales.en.locale, 'Interface language');
    assert.equal(locales.en.theme, 'Theme');
    assert.equal(locales.ru.settingsAction, 'Настройки');
    assert.equal(locales.ru.locale, 'Язык интерфейса');
    assert.equal(locales.ru.theme, 'Тема оформления');
});
