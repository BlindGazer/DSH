import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
        const data = await readFile(resolve(root, target), 'utf8');
        assert.ok(data.trim().length > 0, `${target} is empty`);
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
let registration;
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
    const slots = {
        inject: (_slot, callback) => callback(),
        register: (options, component) => {
            registrations.push({ options, component });
            return () => {};
        }
    };
    const allowed = new Set(client.inject || []);
    const rawContext = { slots, locale: { preference: 'en' } };
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
        assert.equal(action({ subject: { kind: 'row', pkg: { name: '@other/plugin' } } }), undefined);
    });
}

if (failures.length > 0) {
    console.error(failures.map(f => `FAIL ${f}`).join('\n'));
    process.exitCode = 1;
} else {
    console.log('Release verification OK for @kalex/dsh-proxy-provider');
}
