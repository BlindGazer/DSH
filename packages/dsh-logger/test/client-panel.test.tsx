// @vitest-environment jsdom
import type * as Core from '@kalex/dsh-core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestId } from '../../dsh-core/src/constants/testId.ts';
import type { LoggerManagementPanelProps } from '../src/client/LoggerManagementPanel.tsx';
import type { LoggerConfig } from '../src/shared/index.ts';
import { loggerDictionaries } from '../src/shared/localization.ts';
import { LoggerConfigSchema, type LoggerSettingsRemote } from '../src/shared/remote.ts';

let root: Root | undefined;
let theme: 'light' | 'dark' = 'dark';
beforeEach(() => {
    theme = 'dark';
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.doMock('@kalex/dsh-core', async importOriginal => ({ ...(await importOriginal<typeof Core>()), useEffectiveTheme: () => theme }));
});
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.innerHTML = '';
    vi.doUnmock('@kalex/dsh-core');
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
async function renderPanel(config: LoggerConfig, options: Partial<Omit<LoggerManagementPanelProps, 'config' | 'onChange'>> = {}) {
    const { LoggerManagementPanel } = await import('../src/client/LoggerManagementPanel.tsx');
    const host = document.createElement('div');
    host.className = 'dsh-core-root';
    host.dataset.theme = theme;
    document.body.append(host);
    root = createRoot(host);
    let current = config;
    let currentOptions = options;
    const onChange = vi.fn<(value: LoggerConfig) => void>(value => {
        current = value;
        render();
    });
    function render(): void {
        act(() =>
            root?.render(
                <div className="dsh-core-root" data-theme={theme}>
                    <LoggerManagementPanel config={current} onChange={onChange} {...currentOptions} />
                </div>
            )
        );
    }
    render();
    return {
        onChange,
        config: () => current,
        rerender: (next: typeof options) => {
            currentOptions = next;
            render();
        }
    };
}
function scopeRoot(scope?: string): ParentNode {
    if (!scope) return document;
    if (scope === 'Global') {
        const section = document.querySelector('form > div > section');
        if (section) return section;
    }
    const article = [...document.querySelectorAll('article')].find(row => row.querySelector('h3 code')?.textContent === scope);
    if (!article) throw new Error(`Missing scope: ${scope}`);
    return article;
}
function field(label: string, scope: ParentNode): Element {
    const element = [...scope.querySelectorAll('div')].find(row =>
        [...row.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === label)
    );
    if (!element) throw new Error(`Missing field: ${label}`);
    return element;
}
function input(label: string): HTMLInputElement {
    const parts = label.split(': ');
    const name = parts.at(-1) ?? label;
    const scope = scopeRoot(parts.length > 1 ? parts[0] : undefined);
    const rule = /^(Keys|Paths) (\d+)$/.exec(name);
    const collection = rule
        ? [...scope.querySelectorAll('section')].find(row => row.querySelector('h3')?.textContent === rule[1])
        : undefined;
    const element = rule ? collection?.querySelectorAll('input')[Number(rule[2]) - 1] : field(name, scope).querySelector('input');
    if (!(element instanceof HTMLInputElement)) throw new Error(`Missing input: ${label}`);
    return element;
}
function button(label: string): HTMLButtonElement {
    const parts = label.split(': ');
    const name = parts.at(-1) ?? label;
    const scope = scopeRoot(parts.length > 1 ? parts[0] : undefined);
    const remove = /^Remove (keys|paths) (\d+)$/.exec(name);
    const collection = remove
        ? [...scope.querySelectorAll('section')].find(row => row.querySelector('h3')?.textContent?.toLowerCase() === remove[1])
        : undefined;
    const element =
        name === 'Enabled'
            ? scope.querySelector('button[data-checked]')
            : remove
              ? [...(collection?.querySelectorAll('button') ?? [])].filter(row => row.getAttribute('aria-label') === 'Remove')[
                    Number(remove[2]) - 1
                ]
              : name === 'Log level'
                ? field(name, scope).querySelector('button')
                : [...scope.querySelectorAll('button')].find(row => row.getAttribute('aria-label') === name || row.textContent === name);
    if (!(element instanceof HTMLButtonElement)) throw new Error(`Missing button: ${label}`);
    return element;
}
function expectSectionStyles(): void {
    const section = document.querySelector('section.dsh-core-root');
    const style = section?.querySelector('style');
    expect(style).not.toBeNull();
    // Vitest отключает CSS в source suite; содержимое и хеши проверяются через production loader.
    expect(section?.querySelectorAll('style')).toHaveLength(1);
}
function click(element: HTMLElement): void {
    act(() => element.click());
}
function change(label: string, value: string): void {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const control = input(label);
    setter?.call(control, value);
    act(() => {
        control.dispatchEvent(new Event('input', { bubbles: true }));
    });
}
function select(label: string, value: string): void {
    click(button(label));
    const option = [...document.querySelectorAll(`[data-testid="${TestId.Common.SelectOption}"]`)].find(
        row => row.textContent?.trim() === value
    );
    if (!(option instanceof HTMLElement)) throw new Error(`Missing option: ${value}`);
    click(option);
}

// Интеграция панели с реальными hooks и Core primitives проверяет пользовательские сценарии, а не геометрию браузера.
describe('approved LoggerManagementPanel integration', () => {
    it.each([
        ['Global', 'Add key', 'Keys'],
        ['Global', 'Add path', 'Paths'],
        ['pkg', 'Add key', 'Keys'],
        ['pkg', 'Add path', 'Paths']
    ])('focuses the new %s %s input without stealing subsequent focus', async (scope, action, collection) => {
        await renderPanel({ enabled: true }, { packageNames: ['pkg'] });
        if (scope === 'pkg') click(button('pkg: Configure'));
        const disclosure = button(`${scope}: ${action}`).closest('details');
        expect(disclosure?.open).toBe(false);
        const summary = disclosure?.querySelector('summary');
        if (!summary) throw new Error('Missing collection summary');
        click(summary);
        expect(disclosure?.open).toBe(true);
        click(button(`${scope}: ${action}`));
        expect(document.activeElement).toBe(input(`${scope}: ${collection} 1`));
        click(button(`${scope}: ${action}`));
        expect(document.activeElement).toBe(input(`${scope}: ${collection} 2`));
        input('Search plugins').focus();
        change(`${scope}: ${collection} 2`, 'example');
        expect(document.activeElement).toBe(input('Search plugins'));
        click(summary);
        expect(disclosure?.open).toBe(false);
        click(summary);
        expect(input(`${scope}: ${collection} 2`).value).toBe('example');
    });
    it('reloads clean settings immediately from the footer', async () => {
        const onReload = vi.fn();
        await renderPanel({ enabled: true }, { onReload });
        expect(button('Reload').closest('footer')).not.toBeNull();
        click(button('Reload'));
        expect(onReload).toHaveBeenCalledExactlyOnceWith();
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
    });
    it.each(['config', 'path'] as const)('protects a dirty %s draft when reloading and allows explicit discard', async draft => {
        const onReload = vi.fn();
        const onSave = vi.fn();
        const panel = await renderPanel({ enabled: true, path: 'C:/old' }, { onReload, onSave });
        if (draft === 'config') click(button('Enabled'));
        else change('Log directory', 'C:/draft');
        click(button('Reload'));
        expect(onReload).not.toHaveBeenCalled();
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)?.textContent).toContain(
            loggerDictionaries.en.reloadWarning
        );
        click(button('Close'));
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
        expect(panel.config().enabled).toBe(draft !== 'config');
        expect(input('Log directory').value).toBe(draft === 'path' ? 'C:/draft' : 'C:/old');
        expect(button('Save').disabled).toBe(false);
        click(button('Reload'));
        click(button(loggerDictionaries.en.confirmReload));
        expect(onReload).toHaveBeenCalledExactlyOnceWith();
        expect(onSave).not.toHaveBeenCalled();
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
    });
    it('shows saving status and blocks duplicate actions while busy', async () => {
        const onSave = vi.fn();
        const onReload = vi.fn();
        const panel = await renderPanel({ enabled: true }, { onSave, onReload });
        click(button('Enabled'));
        panel.rerender({ onSave, onReload, busy: true });
        expect(document.querySelector('footer small')?.textContent).toBe(loggerDictionaries.en.saving);
        expect(button('Save').disabled).toBe(true);
        expect(button('Cancel').disabled).toBe(true);
        expect(button('Reload').disabled).toBe(true);
        click(button('Save'));
        click(button('Reload'));
        expect(onSave).not.toHaveBeenCalled();
        expect(onReload).not.toHaveBeenCalled();
        panel.rerender({ onSave, onReload });
        expect(button('Save').disabled).toBe(false);
        expect(document.querySelector('footer small')?.textContent).toBe(loggerDictionaries.en.dirty);
    });
    it('uses independent plugin switches even when the global gate is off', async () => {
        const panel = await renderPanel({ enabled: false, plugins: { pkg: { enabled: true } } }, { packageNames: ['pkg', 'other'] });
        expect(button('pkg: Enabled').getAttribute('data-checked')).toBe('true');
        expect(button('pkg: Enabled').disabled).toBe(false);
        click(button('pkg: Enabled'));
        expect(panel.config()).toEqual({ enabled: false, plugins: { pkg: { enabled: false } } });
        expect(button('other: Enabled').getAttribute('data-checked')).toBe('true');
    });
    it('opens and collapses only the selected plugin with the chevron', async () => {
        await renderPanel({ enabled: true }, { packageNames: ['pkg', 'other'] });
        const card = scopeRoot('pkg');
        const configure = button('pkg: Configure');
        expect(configure.getAttribute('data-testid')).toBe(TestId.Common.IconButton);
        expect(configure.querySelector('svg')).not.toBeNull();
        expect(card.querySelector('input[type="number"]')).toBeNull();

        click(configure);
        expect(input('pkg: File limit, MiB').value).toBe('');
        expect(scopeRoot('other').querySelector('input[type="number"]')).toBeNull();

        click(button('pkg: Collapse'));
        expect(card.querySelector('input[type="number"]')).toBeNull();
    });
    it('summarizes only the actual plugin overrides in collapsed cards', async () => {
        await renderPanel(
            {
                enabled: true,
                plugins: {
                    defaults: { enabled: false, sanitizer: { keys: [], paths: [''] } },
                    level: { enabled: true, level: 'debug' },
                    size: { enabled: true, maxFileBytes: 20971520 },
                    rules: { enabled: true, sanitizer: { paths: ['user.email'] } },
                    combined: { enabled: true, level: 'warn', maxFileBytes: 10485760 }
                }
            },
            { packageNames: ['inherited', 'defaults', 'level', 'size', 'rules', 'combined'] }
        );

        expect(scopeRoot('inherited').querySelector('p')).toBeNull();
        expect(scopeRoot('defaults').querySelector('p')).toBeNull();
        expect(scopeRoot('level').querySelector('p')?.textContent).toBe('Custom settings: Debug');
        expect(scopeRoot('size').querySelector('p')?.textContent).toBe('Custom settings: 20 MiB');
        expect(scopeRoot('rules').querySelector('p')?.textContent).toBe('Custom settings: Additional data masking');
        expect(scopeRoot('combined').querySelector('p')?.textContent).toBe('Custom settings: Warn, 10 MiB');
    });
    // Host объединяет выданные логгеры и сохранённые политики; этот тест не классифицирует неактивные плагины.
    it('uses supplied package list for search', async () => {
        await renderPanel({ enabled: true, plugins: { disconnected: { enabled: true } } }, { packageNames: ['alpha', 'beta'] });
        expect(document.body.textContent).not.toContain('disconnected');
        change('Search plugins', 'ALP');
        expect(document.body.textContent).toContain('alpha');
        expect(document.body.textContent).not.toContain('beta');
        change('Search plugins', 'missing');
        expect(document.body.textContent).toContain('No plugins found.');
    });
    it('separates per-global and per-plugin key/path collections with add and remove', async () => {
        const panel = await renderPanel({ enabled: true }, { packageNames: ['pkg'] });
        click(button('Global: Add key'));
        change('Global: Keys 1', 'email');
        click(button('Global: Add path'));
        change('Global: Paths 1', 'user.email');
        click(button('pkg: Configure'));
        click(button('pkg: Add key'));
        change('pkg: Keys 1', 'token');
        click(button('pkg: Add path'));
        change('pkg: Paths 1', 'request.token');
        expect(panel.config().sanitizer).toEqual({ keys: ['email'], paths: ['user.email'] });
        expect(panel.config().plugins?.pkg?.sanitizer).toEqual({ keys: ['token'], paths: ['request.token'] });
        click(button('pkg: Remove keys 1'));
        expect(panel.config().plugins?.pkg?.sanitizer?.keys).toEqual([]);
        expect(panel.config().sanitizer?.keys).toEqual(['email']);
    });
    it('supports explicit inherit and resets overrides without changing enabled', async () => {
        const panel = await renderPanel(
            {
                enabled: true,
                level: 'error',
                maxFileBytes: 10485760,
                plugins: { pkg: { enabled: false, level: 'debug', maxFileBytes: 20971520, sanitizer: { keys: ['email'] } } }
            },
            { packageNames: ['pkg'] }
        );
        click(button('pkg: Configure'));
        expect(input('pkg: File limit, MiB').value).toBe('20');
        select('pkg: Log level', 'Global: Error');
        expect(panel.config().plugins?.pkg?.level).toBeUndefined();
        change('pkg: File limit, MiB', '');
        expect(panel.config().plugins?.pkg?.maxFileBytes).toBeUndefined();
        click(button('Reset to global settings'));
        expect(panel.config().plugins?.pkg).toEqual({ enabled: false });
        expect(button('pkg: Enabled').getAttribute('data-checked')).toBe('false');
    });
    it('tracks dirty state, cancels edits and only saves explicit changes', async () => {
        const onSave = vi.fn();
        const initial = { enabled: true };
        const panel = await renderPanel(initial, { onSave });
        expect(button('Save').disabled).toBe(true);
        click(button('Enabled'));
        expect(button('Save').disabled).toBe(false);
        click(button('Cancel'));
        expect(panel.config()).toEqual(initial);
        expect(button('Save').disabled).toBe(true);
        click(button('Enabled'));
        click(button('Save'));
        expect(onSave).toHaveBeenCalledWith({ enabled: false });
    });
    it('requires matching preview and renders actual objects in a Core Modal before save', async () => {
        const onSave = vi.fn();
        const onPreviewPath = vi.fn();
        const options = { onSave, onPreviewPath, pathPreviewStatus: 'loading' as const, resolvedPath: 'C:/old' };
        const panel = await renderPanel({ enabled: true, path: 'C:/old' }, options);
        change('Log directory', 'C:/new');
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
        click(button('Save'));
        expect(onPreviewPath).toHaveBeenCalledWith('C:/new');
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
        panel.rerender({
            ...options,
            pathPreviewStatus: 'ready',
            previewDraft: 'stale',
            pathPreview: { path: 'C:/new', controlled: 1, unknown: 1, deleted: ['C:/old/pkg.jsonl'], preserved: ['C:/old/notes.txt'] }
        });
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
        panel.rerender({
            ...options,
            pathPreviewStatus: 'ready',
            previewDraft: 'C:/new',
            pathPreview: { path: 'C:/new', controlled: 1, unknown: 1, deleted: ['C:/old/pkg.jsonl'], preserved: ['C:/old/notes.txt'] }
        });
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)?.textContent).toContain('C:/old/pkg.jsonl');
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)?.textContent).toContain('C:/old/notes.txt');
        click(button('Change'));
        expect(onSave).toHaveBeenCalledWith({ enabled: true, path: 'C:/new' });
    });
    it('blocks saving and focuses the invalid file limit until corrected', async () => {
        const onSave = vi.fn();
        await renderPanel({ enabled: true }, { onSave });
        const label = 'Maximum file size, MiB';
        change(label, '0');
        click(button('Save'));
        expect(document.activeElement).toBe(input(label));
        expect(field(label, document).textContent).toContain(loggerDictionaries.en.limitError);
        expect(onSave).not.toHaveBeenCalled();
        change(label, '1');
        expect(field(label, document).textContent).not.toContain(loggerDictionaries.en.limitError);
        click(button('Save'));
        expect(onSave).toHaveBeenCalledOnce();
    });
    it('shows a rejected directory inline and focuses the field without opening a modal', async () => {
        const onSave = vi.fn();
        const message = loggerDictionaries.en.previewError;
        const options = { onSave, onPreviewPath: vi.fn(), pathError: message };
        const panel = await renderPanel({ enabled: true }, options);
        change('Log directory', 'relative');
        click(button('Save'));
        panel.rerender({ ...options, previewDraft: 'relative', pathPreviewStatus: 'error' });
        const directory = input('Log directory');
        expect(field('Log directory', document).textContent).toContain(message);
        expect(document.activeElement).toBe(directory);
        expect(document.querySelector(`[data-testid="${TestId.Common.ModalCard}"]`)).toBeNull();
        expect(onSave).not.toHaveBeenCalled();
        change('Log directory', 'C:/corrected');
        expect(document.body.textContent).not.toContain(message);
        expect(input('Log directory')).toBe(directory);
    });
    it('cancels path confirmation without saving or changing config', async () => {
        const onSave = vi.fn();
        const panel = await renderPanel(
            { enabled: true, path: 'C:/old' },
            {
                onSave,
                onPreviewPath: vi.fn(),
                previewDraft: 'C:/new',
                pathPreviewStatus: 'ready',
                pathPreview: { path: 'C:/new', controlled: 0, unknown: 0, deleted: [], preserved: [] }
            }
        );
        change('Log directory', 'C:/new');
        click(button('Save'));
        click(button('Close'));
        expect(onSave).not.toHaveBeenCalled();
        expect(panel.config().path).toBe('C:/old');
        expect(input('Log directory').value).toBe('C:/old');
    });
    it.each(['config', 'path'] as const)('reloads the saved snapshot only after confirming a section %s draft', async draft => {
        const { LoggerSettingsSection } = await import('../src/client/LoggerSettingsSection.tsx');
        const remote: LoggerSettingsRemote = {
            read: vi.fn().mockResolvedValue({
                config: LoggerConfigSchema.parse({ enabled: true, path: 'C:/logs' }),
                resolvedPath: 'C:/logs',
                packageNames: []
            }),
            save: vi.fn(),
            previewPath: vi.fn()
        };
        const host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        await act(async () => root?.render(<LoggerSettingsSection remote={remote} text={key => loggerDictionaries.en[key]} />));
        if (draft === 'config') click(button('Enabled'));
        else change('Log directory', 'C:/draft');
        click(button('Reload'));
        expect(remote.read).toHaveBeenCalledTimes(1);
        await act(async () => button(loggerDictionaries.en.confirmReload).click());
        expect(remote.read).toHaveBeenCalledTimes(2);
        expect(button('Enabled').getAttribute('data-checked')).toBe('true');
        expect(input('Log directory').value).toBe('C:/logs');
        expect(button('Save').disabled).toBe(true);
        expect(remote.save).not.toHaveBeenCalled();
        expect(remote.previewPath).not.toHaveBeenCalled();
    });
    it('renders a single resolved path in the loaded settings section', async () => {
        const { LoggerSettingsSection } = await import('../src/client/LoggerSettingsSection.tsx');
        const remote: LoggerSettingsRemote = {
            read: vi.fn().mockResolvedValue({
                config: LoggerConfigSchema.parse({ enabled: true }),
                resolvedPath: 'C:/unique-logs',
                packageNames: []
            }),
            save: vi.fn(),
            previewPath: vi.fn()
        };
        const host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        await act(async () => root?.render(<LoggerSettingsSection remote={remote} text={key => loggerDictionaries.en[key]} />));
        expect(document.body.textContent?.split('C:/unique-logs')).toHaveLength(2);
        expect(button('Reload').closest('footer')).not.toBeNull();
        expect(document.body.textContent).toContain(loggerDictionaries.en.noPlugins);
    });
    it('shows loading feedback and blocks reload before the initial snapshot arrives', async () => {
        const { LoggerSettingsSection } = await import('../src/client/LoggerSettingsSection.tsx');
        const remote: LoggerSettingsRemote = {
            read: vi.fn().mockReturnValue(new Promise<Awaited<ReturnType<LoggerSettingsRemote['read']>>>(() => undefined)),
            save: vi.fn(),
            previewPath: vi.fn()
        };
        const host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        await act(async () => root?.render(<LoggerSettingsSection remote={remote} text={key => loggerDictionaries.en[key]} />));
        expectSectionStyles();
        expect(document.body.textContent).toContain(loggerDictionaries.en.loading);
        expect(document.querySelector('form')).toBeNull();
        expect(button('Reload').disabled).toBe(true);
        click(button('Reload'));
        expect(remote.read).toHaveBeenCalledTimes(1);
    });
    it.each(['en', 'ru'] as const)('provides recovery after an initial read error in %s', async locale => {
        const { LoggerSettingsSection } = await import('../src/client/LoggerSettingsSection.tsx');
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const remote: LoggerSettingsRemote = {
            read: vi
                .fn()
                .mockRejectedValueOnce(new Error('read failed'))
                .mockResolvedValue({
                    config: LoggerConfigSchema.parse({ enabled: true }),
                    resolvedPath: 'C:/logs',
                    packageNames: []
                }),
            save: vi.fn(),
            previewPath: vi.fn()
        };
        const host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        await act(async () => root?.render(<LoggerSettingsSection remote={remote} text={key => loggerDictionaries[locale][key]} />));
        expect(document.querySelector('form')).toBeNull();
        expectSectionStyles();
        expect(document.querySelector('aside')?.textContent).toContain(loggerDictionaries[locale].errorRead);
        await act(async () => button(loggerDictionaries[locale].reload).click());
        expect(document.querySelector('form')).not.toBeNull();
        expect(document.body.textContent).toContain(loggerDictionaries[locale].noPlugins);
    });
    it('preserves failed save fields and shows the remote Error.message in a persistent Core Notification', async () => {
        const { LoggerSettingsSection } = await import('../src/client/LoggerSettingsSection.tsx');
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const config = LoggerConfigSchema.parse({ enabled: true });
        const remote = {
            read: vi.fn().mockResolvedValue({ config, resolvedPath: 'C:/logs', packageNames: [] }),
            save: vi.fn().mockRejectedValue(new Error('logger/save: directory access denied <diagnostic>')),
            previewPath: vi.fn()
        };
        const host = document.createElement('div');
        document.body.append(host);
        root = createRoot(host);
        await act(async () => root?.render(<LoggerSettingsSection remote={remote} text={key => loggerDictionaries.en[key]} />));
        change('Maximum file size, MiB', '23');
        await act(async () => button('Save').click());
        expect(input('Maximum file size, MiB').value).toBe('23');
        expect(button('Save').disabled).toBe(false);
        expect(document.querySelector('aside')?.textContent).toContain('logger/save: directory access denied <diagnostic>');
        expect(document.querySelector('diagnostic')).toBeNull();
        expect(document.body.textContent).not.toContain('Logger settings saved.');
        click(button('Close'));
        expect(document.querySelector('aside')).toBeNull();
        expect(input('Maximum file size, MiB').value).toBe('23');
    });
    it.each(['en', 'ru'] as const)('shows override levels and distinct global/plugin protection help in %s', async locale => {
        const text = loggerDictionaries[locale];
        await renderPanel(
            { enabled: true, plugins: { pkg: { enabled: false, level: 'debug' } } },
            { packageNames: ['pkg', 'inherited'], text: key => text[key] }
        );
        const plugin = button(`pkg: ${text.configure}`).closest('article');
        expect(plugin?.querySelector('h3 code')?.textContent).toBe('pkg');
        expect(plugin?.querySelector('button[data-checked="false"]')).not.toBeNull();
        expect(plugin?.querySelector('p')?.textContent).toContain(`${text.overridden}: ${text.debug}`);
        expect(button(`inherited: ${text.configure}`).closest('article')?.querySelector('p')).toBeNull();
        expect(document.body.textContent).toContain(text.sanitizerGlobal);
        expect(document.body.textContent).not.toContain(text.sanitizerInherited);
        click(button(`pkg: ${text.configure}`));
        expect(plugin?.textContent).toContain(text.sanitizerInherited);
        expect(plugin?.textContent).not.toContain(text.sanitizerGlobal);
    });
    it.each([
        ['light', 'en'],
        ['dark', 'en'],
        ['light', 'ru'],
        ['dark', 'ru']
    ] as const)('uses %s theme and %s labels without claiming visual verification', async (currentTheme, locale) => {
        theme = currentTheme;
        const text = loggerDictionaries[locale];
        await renderPanel({ enabled: true }, { text: key => text[key] });
        expect(document.querySelector('form')?.closest('[data-theme]')?.getAttribute('data-theme')).toBe(currentTheme);
        expect(document.querySelector('form h1')).toBeNull();
        expect(document.querySelector('form h2')?.textContent).toBe(text.globalSettings);
        expect(document.querySelector('form h2')?.parentElement?.querySelector('button[data-checked]')).not.toBeNull();
        expect(document.querySelector('footer')?.textContent).not.toContain(text.clean);
        expect(document.body.textContent).toContain(text.defaultLevel);
        expect(document.body.textContent).toContain(text.fileLimitHelp);
        expect(document.body.textContent).toContain(text.globalSettings);
        expect(document.body.textContent).toContain(text.connectedPlugins);
        expect(document.body.textContent).toContain(text.noPlugins);
    });
});
