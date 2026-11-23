// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

function required<T>(value: T | null | undefined, message = 'Missing test fixture element'): T {
    if (value === null || value === undefined) throw new Error(message);
    return value;
}

function clickText(scope: ParentNode, text: string) {
    const button = [...scope.querySelectorAll('button')].find(
        element => element.textContent === text || element.getAttribute('aria-label') === text
    );
    React.act(() => required(button, `Missing button ${text}`).click());
}

type Disposer = () => void | Promise<void>;
type ReadState = 'ready' | 'loading' | 'error';
const modules = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': jsxRuntime };
function resolveRuntime(name: string) {
    if (name === 'react' || name === 'react-dom' || name === 'react/jsx-runtime') return modules[name];
    throw new Error(`Unexpected runtime import: ${name}`);
}

const disposers: Disposer[] = [];
let root: ReturnType<typeof createRoot> | undefined;
afterEach(async () => {
    React.act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dispose of disposers.splice(0).toReversed()) await dispose();
    document.querySelectorAll('style').forEach(style => {
        style.remove();
    });
});

async function mountBundle(locale = 'ru', readState: ReadState = 'ready') {
    const registrations = new Map<string, { namespace: string; component: React.ComponentType<{ t: (key: string) => string }> }>();
    const dictionaries = new Map<string, Readonly<Record<string, string>>>();
    let activeLocale = locale;
    const translator = (namespace: string, language: string) => (key: string) =>
        required(dictionaries.get(`${namespace}:${language}`)?.[key], `Missing locale key ${key}`);
    const wire = {
        read: vi.fn(async () => ({ ok: true, value: { config: { enabled: true }, resolvedPath: 'C:/logs', packageNames: ['pkg'] } })),
        save: vi.fn(),
        previewPath: vi.fn()
    };
    if (readState === 'loading') wire.read.mockReturnValue(new Promise(() => {}));
    if (readState === 'error') wire.read.mockRejectedValue(new Error('Synthetic read failure'));
    const context = {
        remote: { $mount: async () => () => {} },
        get: () => wire,
        locale: {
            register: (namespace: string, language: string, value: Readonly<Record<string, string>>) => {
                const id = `${namespace}:${language}`;
                dictionaries.set(id, value);
                return () => {
                    dictionaries.delete(id);
                };
            },
            bind: (namespace: string) => (key: string) => translator(namespace, activeLocale)(key)
        },
        effect: (callback: () => Disposer) => disposers.push(callback()),
        slots: {
            inject: (_name: string, callback: () => Disposer) => disposers.push(callback()),
            register: (options: { id: string; locale: string }, component: React.ComponentType<{ t: (key: string) => string }>) => {
                registrations.set(options.id, { namespace: options.locale, component });
                return () => {
                    registrations.delete(options.id);
                };
            }
        }
    };
    interface BundlePlugin {
        apply(value: typeof context): Promise<Disposer>;
    }
    let plugin: BundlePlugin | undefined;
    const browser = {
        addEventListener: window.addEventListener.bind(window),
        removeEventListener: window.removeEventListener.bind(window),
        __ModuleLoader__: {
            load({ factory }: { factory: (resolve: typeof resolveRuntime) => BundlePlugin }) {
                plugin = factory(resolveRuntime);
            }
        }
    };
    runInNewContext(readFileSync(resolve(import.meta.dirname, '../lib/client.js'), 'utf8'), {
        window: browser,
        document,
        navigator,
        HTMLElement,
        Error,
        console,
        crypto: window.crypto,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        queueMicrotask
    });
    const dispose = await required<BundlePlugin>(plugin, 'Logger bundle did not register').apply(context);
    disposers.push(dispose);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    host.dataset.slot = 'settings.section';
    document.body.append(host);
    const mountedRoot = createRoot(host);
    root = mountedRoot;
    const { namespace, component } = required(registrations.get('dsh-logger'), 'Logger settings did not register');
    const setLocale = async (language: string) => {
        activeLocale = language;
        await React.act(async () => mountedRoot.render(React.createElement(component, { t: translator(namespace, language) })));
    };
    await setLocale(locale);
    if (readState === 'ready') expect(document.body.textContent).toContain('pkg');
    return { wire, setLocale };
}

it('matches literal Russian mockup labels and keeps global/plugin collections independent', async () => {
    await mountBundle();
    const labels = [
        'Общие настройки',
        'Уровень по умолчанию',
        'Максимальный размер файла, МиБ',
        'Отдельный лимит для каждого файла плагина',
        'Каталог логов',
        'Фактический путь:',
        'Дополнительное скрытие данных',
        'Общие коллекции для всех плагинов. Базовая защита всегда включена.',
        'Ключи',
        'Пути',
        'Имя ключа на любой глубине, например email или token.',
        'Точный путь через точку, например user.email или request.headers.authorization.',
        'Нет дополнительных правил',
        'Подключённые плагины',
        'Поиск плагина',
        'Отменить',
        'Сохранить'
    ];
    for (const label of labels) expect(document.body.textContent).toContain(label);
    const global = required(document.querySelector('form > div > section'));
    const collections = [...global.querySelectorAll('section')];
    expect(collections.map(section => required(section.querySelector('h3')).textContent)).toEqual(['Ключи', 'Пути']);
    for (const collection of collections) {
        expect(required(collection.querySelector('details')).open).toBe(false);
        React.act(() => required(collection.querySelector<HTMLElement>('summary')).click());
    }
    clickText(global, 'Добавить ключ');
    clickText(global, 'Добавить путь');
    expect(collections.map(section => section.querySelectorAll('input').length)).toEqual([1, 1]);
    const plugin = required(document.querySelector('article'));
    expect(plugin.querySelector('button[data-checked="true"]')).not.toBeNull();
    expect(plugin.querySelector('button[aria-label="Настроить"] svg')).not.toBeNull();
    clickText(plugin, 'Настроить');
    for (const label of [
        'Уровень логирования',
        'Лимит файла, МиБ',
        'Общий: Info',
        'Пустое поле: общий лимит 10 МиБ',
        'Коллекции плагина дополняют общие правила. Базовая защита всегда включена.',
        'Сбросить к общим'
    ]) {
        expect(plugin.textContent).toContain(label);
    }
    const pluginCollections = [...plugin.querySelectorAll('section')];
    for (const collection of pluginCollections) {
        expect(required(collection.querySelector('details')).open).toBe(false);
        React.act(() => required(collection.querySelector<HTMLElement>('summary')).click());
    }
    clickText(plugin, 'Добавить ключ');
    clickText(plugin, 'Добавить путь');
    expect(pluginCollections.map(section => section.querySelectorAll('input').length)).toEqual([1, 1]);
    clickText(required(pluginCollections[0]), 'Удалить');
    expect(pluginCollections.map(section => section.querySelectorAll('input').length)).toEqual([0, 1]);
    expect(collections.map(section => section.querySelectorAll('input').length)).toEqual([1, 1]);
    clickText(required(collections[1]), 'Удалить');
    expect(collections.map(section => section.querySelectorAll('input').length)).toEqual([1, 0]);
    expect(document.body.textContent).toContain('Есть несохранённые изменения');
});

it.each(['loading', 'error'] as const)('injects compiled section styles in the %s state without mounting a panel', async state => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mountBundle('en', state);
    expect(document.querySelector('form')).toBeNull();
    const section = required(document.querySelector('section.dsh-core-root'));
    const featureClass = [...section.classList].find(name => name !== 'dsh-core-root');
    const styles = section.querySelectorAll('style');
    expect(styles).toHaveLength(1);
    expect(required(styles[0]).textContent?.includes(`.${featureClass}`)).toBe(true);
    expect(document.body.textContent).toContain(state === 'loading' ? 'Loading logger settings...' : 'Could not load logger settings.');
});

it('requires the Core path confirmation before saving through the bundled client', async () => {
    const { wire } = await mountBundle();
    wire.previewPath.mockResolvedValue({
        ok: true,
        value: { path: 'C:/new-logs', controlled: 1, unknown: 1, deleted: ['pkg.jsonl'], preserved: ['notes.txt'] }
    });
    wire.save.mockResolvedValue({
        ok: true,
        value: { config: { enabled: true, path: 'C:/new-logs' }, resolvedPath: 'C:/new-logs', packageNames: ['pkg'] }
    });
    const input = required(document.querySelector<HTMLInputElement>('form > div > section input[type="text"]'));
    React.act(() => {
        required(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set).call(input, 'C:/new-logs');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => required(document.querySelector<HTMLButtonElement>('footer button[type="submit"]')).click());
    const dialog = required(document.querySelector('.dsh-modal-card'));
    expect(dialog.textContent).toContain('Сменить каталог логов?');
    expect(dialog.textContent).toContain('pkg.jsonl');
    expect(dialog.textContent).toContain('notes.txt');
    expect(wire.save).not.toHaveBeenCalled();
    await React.act(async () => clickText(dialog, 'Сменить'));
    expect(wire.save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ confirmPathChange: true, cleanupPaths: ['pkg.jsonl'] }));
});

it('returns a rejected path to its field without a modal or notification', async () => {
    const { wire } = await mountBundle();
    wire.previewPath.mockResolvedValue({ ok: false, error: new Error('Logger path must be absolute') });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const input = required(document.querySelector<HTMLInputElement>('form > div > section input[type="text"]'));
    React.act(() => {
        required(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set).call(input, 'relative');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => required(document.querySelector<HTMLButtonElement>('footer button[type="submit"]')).click());
    expect(required(input.parentElement).textContent).toContain('Проверьте абсолютный путь');
    expect(document.activeElement).toBe(input);
    expect(document.querySelector('.dsh-modal-card, .dsh-notification')).toBeNull();
    expect(wire.save).not.toHaveBeenCalled();
    clickText(required(document.querySelector('footer')), 'Отменить');
    expect(required(input.parentElement).textContent).not.toContain('Проверьте абсолютный путь');
});

it('loads the English production settings renderer', async () => {
    await mountBundle('en');
    for (const label of ['Global settings', 'Connected plugins', 'Keys', 'Paths', 'Save']) {
        expect(document.body.textContent).toContain(label);
    }
});

it('updates the mounted settings section without refetching or translating raw diagnostic text', async () => {
    const { wire, setLocale } = await mountBundle('en');
    const rawMessage = 'Save: Сохранить <raw diagnostic>';
    wire.save.mockResolvedValue({ ok: false, error: new Error(rawMessage) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const form = required(document.querySelector('form'));
    const heading = required(form.querySelector('h2'));
    const reload = required(form.querySelector('button[aria-label="Reload"]'));
    const limit = required(form.querySelector<HTMLInputElement>('input[type="number"]'));
    React.act(() => {
        required(Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set).call(limit, '23');
        limit.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => required(form.querySelector<HTMLButtonElement>('button[type="submit"]')).click());
    const notice = required(document.querySelector('aside'));

    expect(heading.textContent).toBe('Global settings');
    expect(notice.textContent).toContain(rawMessage);
    await setLocale('ru');
    expect(heading.textContent).toBe('Общие настройки');
    expect(reload.getAttribute('aria-label')).toBe('Перезагрузить');
    expect(notice.textContent).toContain('Не удалось сохранить настройки логирования.');
    expect(notice.textContent).toContain(rawMessage);
    await setLocale('en');
    expect(heading.textContent).toBe('Global settings');
    expect(reload.getAttribute('aria-label')).toBe('Reload');
    expect(notice.textContent).toContain('Could not save logger settings.');
    expect(notice.textContent).toContain(rawMessage);
    expect(document.querySelector('form')).toBe(form);
    expect(limit.value).toBe('23');
    expect(wire.read).toHaveBeenCalledOnce();
    expect(wire.save).toHaveBeenCalledOnce();
    expect(wire.previewPath).not.toHaveBeenCalled();
});

// Проверяет доставку CSS production bundle, не геометрию или скриншот браузера.
it('injects feature CSS matching the compiled panel classes through the DSH loader', async () => {
    await mountBundle();
    const panel = required(document.querySelector('form'));
    const featureClass = [...panel.classList].find(name => name !== 'dsh-core-root');
    expect(featureClass).toBeTruthy();
    const css = [...document.querySelectorAll('style')].map(style => style.textContent).join('\n');
    expect(css.includes(`.${featureClass}`), `Missing injected CSS for ${featureClass}`).toBe(true);
    const declarations = (element: Element, suffix = '') => {
        const className = [...element.classList].find(name => name.startsWith('_'));
        expect(className).toBeTruthy();
        const selector = `.${className}${suffix}`;
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`).exec(css);
        expect(match, `Missing compiled selector ${selector}`).not.toBeNull();
        return required(match?.[1]).replace(/\s/g, '');
    };
    expect(declarations(panel)).toContain('display:grid');
    expect(declarations(panel)).not.toMatch(/(?:^|;)padding:/);
    expect(declarations(panel, ' h2')).toContain('font-size:18px');
    const footer = required(panel.querySelector('footer'));
    const reload = required(footer.querySelector('button[aria-label="Перезагрузить"]'));
    expect(reload.querySelector('svg')).not.toBeNull();
    expect(reload.textContent).toBe('');
    const body = required(footer.previousElementSibling);
    expect(body.contains(footer)).toBe(false);
    expect(declarations(body)).toContain('overflow:auto');
    expect(css).toContain('margin-inline-end:');
    expect(footer.querySelector('button:last-child[type="submit"]')).not.toBeNull();
    expect(declarations(panel)).toContain('grid-template-rows:minmax(0,1fr)auto');
    expect(declarations(footer)).toContain('background-color:var(--dsh-ui-bg-modal)');
    expect(declarations(panel, ' h3')).toContain('font-size:15px');
    expect(declarations(required(document.querySelector('fieldset')))).toContain('border:0');
    const sections = [...body.querySelectorAll(':scope > section')];
    expect(sections).toHaveLength(2);
    expect(sections.every(section => section.classList.length === 0)).toBe(true);
    const plugin = required(panel.querySelector('article'));
    expect(declarations(plugin)).toContain('background:var(--dsh-ui-elevated)');
    const collections = [...required(sections[0]).querySelectorAll('section')];
    expect(collections).toHaveLength(2);
    for (const collection of collections) expect(declarations(collection)).toContain('border:1pxsolidvar(--dsh-ui-border)');
    expect(declarations(required(required(collections[0]).parentElement))).toContain(
        'grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))'
    );
    expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*14rem\),\s*1fr\)\)/);
    React.act(() => required(root).unmount());
    root = undefined;
    const remaining = [...document.querySelectorAll('style')].map(style => style.textContent).join('\n');
    expect(remaining.includes(`.${featureClass}`)).toBe(false);
});
