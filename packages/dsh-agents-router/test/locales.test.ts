import { assert, test } from 'vitest';

import { locales } from '../src/shared/constants/localizations/RouterUiLocalization.ts';

test('instruction redirection hint explains root-file and directory scope in both locales', () => {
    assert.match(locales.en.instructionRedirectionHint, /directly in the project root/);
    assert.match(locales.en.instructionRedirectionHint, /relative paths preserved/);
    assert.match(locales.ru.instructionRedirectionHint, /непосредственно из корня проекта/);
    assert.match(locales.ru.instructionRedirectionHint, /сохраняется относительный путь файла/);
});

test('Router global settings labels are translated in both supported locales', () => {
    assert.equal(locales.en.settingsAction, 'Settings');
    assert.equal(locales.en.theme, 'Theme');
    assert.equal(locales.ru.settingsAction, 'Настройки');
    assert.equal(locales.ru.theme, 'Тема оформления');
});
