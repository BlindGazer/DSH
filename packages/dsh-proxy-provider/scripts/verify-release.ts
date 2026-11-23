import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8');
const failures = [];
const check = async (label, fn) => {
    try {
        await fn();
        console.log(`OK ${label}`);
    } catch (error) {
        failures.push(`${label}: ${error.message}`);
    }
};

const targets = new Set();
for (const entry of Object.values(pkg.exports || {})) {
    if (typeof entry === 'string') targets.add(entry);
    else if (entry && typeof entry === 'object') {
        for (const target of Object.values(entry)) {
            if (typeof target === 'string') targets.add(target);
        }
    }
}
for (const match of patch.matchAll(/name:\s*["']?\.\/([^\s"']+)/g)) targets.add(`./${match[1]}`);
for (const target of targets) {
    await check(`non-empty ${target}`, async () => {
        const files = target.includes('*') ? await Array.fromAsync(glob(target, { cwd: root })) : [target];
        assert.ok(files.length > 0, `${target} matches no published files`);
        for (const file of files) {
            const data = await readFile(resolve(root, file), 'utf8');
            assert.ok(data.trim().length > 0, `${file} is empty`);
            if (target.startsWith('./locale/')) assert.doesNotThrow(() => JSON.parse(data), `${file} must contain valid locale JSON`);
        }
    });
}
await check('lib is included in package files', () => assert.ok(pkg.files?.includes('lib')));
await check('Node entry imports and exports required symbols', async () => {
    const plugin = await import(pathToFileURL(resolve(root, 'lib/index.js')).href);
    assert.equal(plugin.name, 'dsh-proxy-provider');
    assert.equal(typeof plugin.apply, 'function');
    assert.equal(typeof plugin.createProviderProxyController, 'function');
    assert.equal(typeof plugin.compileRoutingTable, 'function');
    assert.equal(typeof plugin.testProxyConnection, 'function');
});

const clientPath = resolve(root, 'lib/client.js');
const clientCode = await readFile(clientPath, 'utf8');
await check('client bundle parses', () => new vm.Script(clientCode, { filename: clientPath }));
let registration:
    | { id: string; factory: (resolveModule: (id: string) => object) => { inject: readonly string[]; apply: (context: object) => void } }
    | undefined;
const sandbox = {
    window: {
        __ModuleLoader__: {
            load: entry => {
                registration = entry;
            }
        },
        addEventListener() {},
        removeEventListener() {}
    },
    document: {
        querySelector: () => null,
        createElement: () => ({ dataset: {}, textContent: '' }),
        head: { appendChild() {} },
        body: { appendChild() {}, removeChild() {} },
        addEventListener() {},
        removeEventListener() {}
    },
    URL,
    fetch: async () => ({
        ok: true,
        json: async () => ({ ok: true, config: { profiles: [], providerBindings: {} }, providers: [], conflicts: [], routes: {} })
    }),
    setInterval: () => 1,
    clearInterval() {},
    console
};
vm.runInNewContext(clientCode, sandbox, { filename: clientPath });
await check('one ModuleLoader registration with package id', () => {
    assert.equal(registration?.id, pkg.name);
    assert.equal(typeof registration?.factory, 'function');
});

if (registration) {
    const react = {
        useState: value => [typeof value === 'function' ? value() : value, () => {}],
        useEffect() {},
        useRef: current => ({ current }),
        useCallback: fn => fn,
        useMemo: fn => fn()
    };
    const jsxRuntime = {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
        Fragment: Symbol.for('fragment')
    };
    const client = registration.factory(id => (id === 'react' ? react : id === 'react/jsx-runtime' ? jsxRuntime : {}));
    const registrations = [];
    const effects: Array<() => void> = [];
    const dictionaries = new Map<string, Map<string, Readonly<Record<string, string>>>>();
    let active = 'en';
    let revision = 0;
    const translators = new Map<string, (key: string, params?: Readonly<Record<string, string | number>>) => string>();
    const effect = (setup: () => (() => void) | undefined) => {
        const cleanup = setup();
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            cleanup?.();
        };
        effects.push(dispose);
        return dispose;
    };
    const slots = {
        inject: (_slot: string, callback: () => (() => void) | undefined) => effect(callback),
        register: (options, component) => {
            const entry = { options, component };
            return effect(() => {
                registrations.push(entry);
                return () => {
                    const index = registrations.indexOf(entry);
                    if (index >= 0) registrations.splice(index, 1);
                };
            });
        }
    };
    const locale = {
        register(namespace: string, language: string, dictionary: Readonly<Record<string, string>>) {
            const group = dictionaries.get(namespace) ?? new Map();
            assert.ok(!group.has(language), `duplicate dictionary: ${namespace}/${language}`);
            group.set(language, dictionary);
            dictionaries.set(namespace, group);
            revision++;
            return () => {
                group.delete(language);
                if (group.size === 0) dictionaries.delete(namespace);
                revision++;
            };
        },
        bind(namespace: string) {
            const existing = translators.get(namespace);
            if (existing) return existing;
            const translate = (key: string, params?: Readonly<Record<string, string | number>>) => {
                const group = dictionaries.get(namespace);
                const message = group?.get(active)?.[key] ?? group?.get('en')?.[key] ?? key;
                return message.replace(/\{(\w+)\}/g, (match, name: string) => String(params?.[name] ?? match));
            };
            translators.set(namespace, translate);
            return translate;
        },
        getSnapshot: () => ({ active, revision })
    };
    const allowed = new Set([...(client.inject || []), 'effect']);
    const rawContext = { slots, locale, effect };
    const strictContext = new Proxy(rawContext, {
        get(target, key, receiver) {
            if (typeof key === 'string' && !allowed.has(key)) throw new Error(`undeclared ctx property: ${key}`);
            return Reflect.get(target, key, receiver);
        }
    });
    await check('apply reads only injected context properties', () => client.apply(strictContext));
    await check('settings.models.provider-card is registered with keyed options', () => {
        assert.ok(registrations.some(({ options }) => options.name === 'settings.models.provider-card' && typeof options.key === 'string'));
    });
    await check('Plugin Manager detail action is registered and ignores unrelated packages', () => {
        const action = registrations.find(
            ({ options }) => options.name === 'plugins.detail.actions' && options.id === 'dsh-proxy-provider-settings-action'
        )?.component;
        assert.equal(typeof action, 'function');
        const element = action({ subject: { kind: 'row', pkg: { name: '@other/plugin' } } });
        assert.equal(element?.type(element.props), undefined);
    });
    await check('localized slots use the registered dictionaries and active shell locale', () => {
        const footer = registrations.find(({ options }) => options.name === 'settings.models.footer');
        assert.ok(footer);
        const namespace = footer.options.locale;
        assert.equal(typeof namespace, 'string');
        assert.deepEqual([...(dictionaries.get(namespace)?.keys() ?? [])].toSorted(), ['en', 'ru']);
        assert.ok(registrations.every(({ options }) => options.locale === namespace));
        assert.equal(typeof footer.options.label, 'function');
        const bound = locale.bind(namespace);
        const assertLocale = (language: string, label: string, summary: string) => {
            active = language;
            revision++;
            const seatRevision = revision;
            const injectedTranslate = (key: string, params?: Readonly<Record<string, string | number>>) => {
                assert.equal(revision, seatRevision);
                return bound(key, params);
            };
            const rendered = footer.component({ t: injectedTranslate });
            assert.equal(rendered.props.t, injectedTranslate);
            assert.equal(rendered.props.active, language);
            assert.equal(footer.options.label(), label);
            assert.equal(injectedTranslate('summary', { profiles: 2, providers: 1 }), summary);
        };
        assertLocale('en', 'Proxy settings', '2 profile(s); 1 proxied provider(s)');
        assertLocale('ru', 'Настройки прокси', 'Профилей: 2; провайдеров через прокси: 1');
        assertLocale('en', 'Proxy settings', '2 profile(s); 1 proxied provider(s)');
    });
    const disposeAll = () => {
        while (effects.length) effects.pop()?.();
    };
    await check('unload removes registrations and dictionaries before reactivation', () => {
        const count = registrations.length;
        disposeAll();
        assert.equal(registrations.length, 0);
        assert.equal(dictionaries.size, 0);
        try {
            client.apply(strictContext);
            assert.equal(registrations.length, count);
            assert.equal(dictionaries.size, 1);
        } finally {
            disposeAll();
        }
    });
}

if (failures.length > 0) {
    console.error(failures.map(f => `FAIL ${f}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log('Release verification OK for @kalex/dsh-proxy-provider');
}
