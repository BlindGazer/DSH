import type { DshLocaleCode, DshLocalePreference } from '@kalex/dsh-core';
import { type KeyValueStorage, persistLocale, readSavedLocale, resolveDshLocale } from '@kalex/dsh-core/hooks/useLocalePreference.js';
import { PROXY_LOCALE_KEY } from '../endpoints.js';

export const ProxyRussianDictionary: Readonly<Record<string, string>> = {
    Direct: 'Напрямую',
    'Direct (No proxy)': 'Напрямую (без прокси)',
    'Direct connection (bypasses proxy)': 'Прямое подключение без прокси',
    'Proxy settings': 'Настройки прокси',
    'Proxy profile for ': 'Профиль прокси для ',
    'Proxy: ': 'Прокси: ',
    Close: 'Закрыть',
    '1. Proxy Profiles': '1. Профили прокси',
    '+ Add Profile': '+ Добавить профиль',
    'No proxy profiles created yet. Click "+ Add Profile" to configure HTTP, HTTPS, or SOCKS5 proxy.':
        'Профили прокси пока не созданы. Нажмите "+ Добавить профиль", чтобы настроить прокси HTTP, HTTPS или SOCKS5.',
    Edit: 'Изменить',
    Delete: 'Удалить',
    Cancel: 'Отмена',
    'Confirm Delete & Reset to Direct': 'Удалить и сбросить на прямое подключение',
    'Create Proxy Profile': 'Создать профиль прокси',
    'Profile Name': 'Название профиля',
    'e.g. Corporate Proxy': 'Например, корпоративный прокси',
    Protocol: 'Протокол',
    'Port (1–65535)': 'Порт (1–65535)',
    'Host (IP or domain, scheme stripped automatically)': 'Узел (IP-адрес или домен, схема удаляется автоматически)',
    'proxy.corp.local or 127.0.0.1': 'proxy.corp.local или 127.0.0.1',
    'Requires authentication (Basic / SOCKS5 Username & Password)': 'Требуется аутентификация (имя пользователя и пароль Basic или SOCKS5)',
    'Ignore SSL / TLS certificate errors (rejectUnauthorized: false)':
        'Игнорировать ошибки сертификата SSL / TLS (rejectUnauthorized: false)',
    'Test Connection (5000ms TCP + HTTP check)': 'Проверить подключение (проверка TCP и HTTP, 5000 мс)',
    'Testing...': 'Проверка...',
    Test: 'Проверить',
    'Saving...': 'Сохранение...',
    'Save Profile': 'Сохранить профиль',
    'Include credentials': 'Включить учетные данные',
    Export: 'Экспорт',
    Import: 'Импорт',
    'Encrypt Credentials for Portable Export': 'Зашифровать учетные данные для переноса',
    'Enter a password to encrypt login & password (AES-256-GCM) so they can be imported on another computer:':
        'Введите пароль для шифрования имени пользователя и пароля (AES-256-GCM), чтобы импортировать их на другом компьютере:',
    'Enter encryption password...': 'Введите пароль шифрования...',
    'Download Export': 'Скачать экспорт',
    'Encrypted Credentials Detected in Import File': 'В файле импорта найдены зашифрованные учетные данные',
    'Enter the password used when exporting this file to decrypt and restore login & password:':
        'Введите пароль, указанный при экспорте файла, чтобы расшифровать и восстановить учетные данные:',
    'Enter decryption password...': 'Введите пароль расшифровки...',
    'Decrypt & Import': 'Расшифровать и импортировать',
    'Import Without Credentials': 'Импортировать без учетных данных',
    'Search provider by name or host...': 'Поиск провайдера по имени или узлу...',
    'Search provider by name or host': 'Поиск провайдера по имени или узлу',
    'Clear search': 'Очистить поиск',
    'Domain / Host Routing Conflict Detected': 'Обнаружен конфликт маршрутизации домена или узла',
    Custom: 'Пользовательский',
    'Interface language': 'Язык интерфейса',
    English: 'Английский',
    Russian: 'Русский',
    Save: 'Сохранить',
    Reset: 'Сбросить',
    Error: 'Ошибка',
    Username: 'Имя пользователя',
    'Leave blank to keep saved username': 'Оставьте поле пустым, чтобы сохранить имя пользователя',
    'Enter username': 'Введите имя пользователя',
    Password: 'Пароль',
    'Password (saved encrypted)': 'Пароль (сохранен в зашифрованном виде)',
    'Leave blank to keep saved password': 'Оставьте поле пустым, чтобы сохранить пароль',
    'Enter password': 'Введите пароль',
    Hide: 'Скрыть',
    Show: 'Показать',
    'Edit Profile: ': 'Изменить профиль: ',
    'Profile Name is required.': 'Укажите название профиля.',
    'Valid proxy Host (IP or domain without scheme) is required.': 'Укажите корректный узел прокси (IP-адрес или домен без схемы).',
    'Port must be an integer between 1 and 65535.': 'Порт должен быть целым числом от 1 до 65535.',
    'Failed to save profile': 'Не удалось сохранить профиль',
    'Failed to delete profile': 'Не удалось удалить профиль',
    'Please enter a valid Host and Port (1–65535) before testing.': 'Перед проверкой укажите корректный узел и порт (1–65535).',
    'Connection test request failed': 'Не удалось выполнить проверку подключения',
    'When checked, Export will ask for a password and include encrypted login & password for portable transfer to another computer':
        'Если включено, при экспорте будет запрошен пароль, а учетные данные будут зашифрованы для переноса на другой компьютер',
    'Export proxy settings and password-encrypted credentials': 'Экспортировать настройки прокси и зашифрованные учетные данные',
    'Export proxy settings without credentials': 'Экспортировать настройки прокси без учетных данных',
    'Import proxy profiles and routing from JSON file': 'Импортировать профили прокси и маршрутизацию из файла JSON',
    'Please enter a password to encrypt credentials.': 'Введите пароль для шифрования учетных данных.',
    'Please enter the password to decrypt imported credentials.': 'Введите пароль для расшифровки импортированных учетных данных.',
    'Failed to export settings': 'Не удалось экспортировать настройки',
    'Failed to export encrypted settings': 'Не удалось экспортировать зашифрованные настройки',
    'Invalid JSON file for proxy settings import': 'Некорректный JSON-файл настроек прокси',
    'Failed to decrypt and import proxy settings': 'Не удалось расшифровать и импортировать настройки прокси',
    'Failed to load proxy settings': 'Не удалось загрузить настройки прокси',
    'Failed to update proxy binding': 'Не удалось обновить привязку прокси',
    '2. Provider Routing (': '2. Маршрутизация провайдеров (',
    'Host ': 'Узел ',
    'Failed to save proxy configuration': 'Не удалось сохранить настройки прокси',
    'Failed to bind provider proxy': 'Не удалось назначить прокси провайдеру',
    'Failed to export proxy configuration': 'Не удалось экспортировать настройки прокси',
    'Failed to import proxy configuration': 'Не удалось импортировать настройки прокси',
    'Valid proxy host and port (1-65535) are required': 'Укажите корректный узел прокси и порт (1-65535)',
    'Proxy host and port are required': 'Требуются узел прокси и порт',
    'Proxy Authentication Required (407): check username and password':
        'Требуется аутентификация прокси (407): проверьте имя пользователя и пароль',
    'Invalid encrypted credential format in import file': 'Некорректный формат зашифрованных учетных данных в файле импорта',
    'Invalid password for encrypted credentials': 'Неверный пароль для зашифрованных учетных данных',
    'Encryption password is required when exporting credentials': 'Для экспорта учетных данных требуется пароль шифрования',
    'Invalid import file: expected a JSON object': 'Некорректный файл импорта: ожидался объект JSON',
    'Invalid import file: "profiles" array is required': 'Некорректный файл импорта: требуется массив "profiles"',
    'PASSWORD_REQUIRED: This export file contains encrypted credentials. Please enter the decryption password.':
        'Для этого файла экспорта требуется пароль расшифровки учетных данных.',
    'Forbidden: access restricted to DSH Web GUI': 'Доступ запрещен: доступ разрешен только из веб-интерфейса DSH',
    'providerId is required': 'Требуется идентификатор провайдера'
};

/**
 * Вычисляет активный язык интерфейса прокси ('en' или 'ru') с учетом выбора пользователя и языка DSH.
 */
export function resolveProxyLocale(choice?: DshLocalePreference | string, hostLocale?: string): DshLocaleCode {
    const normalizedChoice: DshLocalePreference | undefined = choice === 'ru' || choice === 'en' || choice === 'auto' ? choice : undefined;
    return resolveDshLocale(normalizedChoice, hostLocale);
}

/**
 * Читает сохраненный выбор языка прокси из хранилища.
 */
export function readSavedProxyLocale(storage?: KeyValueStorage): DshLocaleCode | undefined {
    return readSavedLocale(PROXY_LOCALE_KEY, storage);
}

/**
 * Сохраняет выбранный пользователем язык прокси в хранилище.
 */
export function persistProxyLocale(storage: KeyValueStorage | undefined, locale: string): void {
    if (locale === 'ru' || locale === 'en') {
        persistLocale(PROXY_LOCALE_KEY, locale, storage);
    }
}

/**
 * Переводит статические и шаблонные строки интерфейса прокси на выбранный язык.
 */
export function translateProxyText(value: string, locale: DshLocaleCode = 'en'): string {
    if (locale !== 'ru' || typeof value !== 'string') return value;
    const directMatch = ProxyRussianDictionary[value];
    if (directMatch !== undefined) return directMatch;

    const count = /^(\d+) profile\(s\) • (\d+) proxied provider\(s\)$/.exec(value);
    if (count) return `Профилей: ${count[1]} • провайдеров через прокси: ${count[2]}`;
    const conflicts = /^⚠ (\d+) host conflict\(s\)$/.exec(value);
    if (conflicts) return `⚠ Конфликтов узлов: ${conflicts[1]}`;
    const profile = /^Edit Profile: (.+)$/.exec(value);
    if (profile) return `Изменить профиль: ${profile[1]}`;
    const username = /^Username \(saved: (.+)\)$/.exec(value);
    if (username) return `Имя пользователя (сохранено: ${username[1]})`;
    const routing = /^2\. Provider Routing \((\d+)\/(\d+)\)$/.exec(value);
    if (routing) return `2. Маршрутизация провайдеров (${routing[1]}/${routing[2]})`;
    const profileProxy = /^Proxy: (.+) \((.+)\)$/.exec(value);
    if (profileProxy) return `Прокси: ${profileProxy[1]} (${profileProxy[2]})`;
    const provider = /^(Proxy profile for |Route for )(.+)$/.exec(value);
    if (provider) return `${provider[1] === 'Route for ' ? 'Маршрут для ' : 'Профиль прокси для '}${provider[2]}`;
    const hostConflict =
        /^Host (.+) is shared by multiple providers with different proxy settings\. Active proxy "(.+)" is applied to the entire host\.$/.exec(
            value
        );
    if (hostConflict)
        return `Узел ${hostConflict[1]} используется несколькими провайдерами с разными настройками прокси. Прокси "${hostConflict[2]}" применяется ко всему узлу.`;
    const noProviders = /^No providers matching "(.+)"\.$/.exec(value);
    if (noProviders) return `Нет провайдеров по запросу "${noProviders[1]}".`;
    const assigned =
        /^Profile "(.+)" is currently assigned to: (.+)\. Deleting it will reset those providers to Direct \(No proxy\)\.$/.exec(value);
    if (assigned)
        return `Профиль "${assigned[1]}" назначен для: ${assigned[2]}. После удаления эти провайдеры будут переключены на прямое подключение.`;
    const imported = /^Imported (\d+) profile\(s\) (.+)\.$/.exec(value);
    if (imported) {
        const detail =
            imported[2] === 'successfully'
                ? 'успешно'
                : imported[2] === 'without credentials'
                  ? 'без учетных данных'
                  : 'с расшифрованными учетными данными';
        return `Импортировано профилей: ${imported[1]}, ${detail}.`;
    }
    const exported = /^(.+) exported to kalex-provider-proxy-settings\.json$/.exec(value);
    if (exported) {
        const detail =
            exported[1] === 'Settings and password-encrypted credentials'
                ? 'настройки и зашифрованные учетные данные'
                : 'настройки прокси без учетных данных';
        return `Экспортированы ${detail} (kalex-provider-proxy-settings.json)`;
    }
    const conflictTitle = /^⚠ Host conflict \((.+) → (.+)\)$/.exec(value);
    if (conflictTitle) return `⚠ Конфликт узла (${conflictTitle[1]}, применяется прокси ${conflictTitle[2]})`;
    const conflictDetails = /^Host "(.+)" is shared by \[(.+)\]\. Active proxy "(.+)" is applied to all requests to (.+)\.$/.exec(value);
    if (conflictDetails)
        return `Узел "${conflictDetails[1]}" используется несколькими провайдерами: ${conflictDetails[2]}. Прокси "${conflictDetails[3]}" применяется ко всем запросам к ${conflictDetails[4]}.`;
    const testSuccess = /^✓ Proxy reachable! TCP OK \((\d+)ms\) • Target HTTP (.+) \((\d+)ms\)$/.exec(value);
    if (testSuccess) return `✓ Прокси доступен. TCP: ${testSuccess[1]} мс. HTTP-ответ: ${testSuccess[2]} (${testSuccess[3]} мс).`;
    const testFailure = /^✕ (.+) \(TCP connected in (\d+)ms, HTTP stage failed\)$/.exec(value);
    if (testFailure) return `✕ ${testFailure[1]} (TCP подключен за ${testFailure[2]} мс, этап HTTP завершился ошибкой)`;
    const tcpFailure = /^TCP connection to proxy (.+):(\d+) failed \(timeout 5000ms or connection refused\)$/.exec(value);
    if (tcpFailure) return `Не удалось подключиться к прокси ${tcpFailure[1]}:${tcpFailure[2]} (тайм-аут 5000 мс или соединение отклонено)`;
    const sslFailure =
        /^SSL\/TLS certificate error \((.+)\)\. Enable "Ignore SSL \/ TLS certificate errors" if your proxy uses a corporate root CA\.$/.exec(
            value
        );
    if (sslFailure)
        return `Ошибка сертификата SSL/TLS (${sslFailure[1]}). Если прокси использует корпоративный корневой сертификат, включите игнорирование ошибок сертификатов.`;
    const httpFailure = /^HTTP request through proxy failed: (.+)$/.exec(value);
    if (httpFailure) return `Ошибка HTTP-запроса через прокси: ${httpFailure[1]}`;
    const unknownEndpoint = /^Unknown endpoint "(.+)"$/.exec(value);
    if (unknownEndpoint) return `Неизвестный адрес запроса: "${unknownEndpoint[1]}"`;
    const wrappedFailure = /^✕ (.+)$/.exec(value);
    if (wrappedFailure?.[1]) return `✕ ${translateProxyText(wrappedFailure[1], 'ru')}`;
    return value;
}
