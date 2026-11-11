import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8');
const failures = [];
const check = async (label, run) => {
    try {
        await run();
        console.log(`OK ${label}`);
    } catch (error) {
        failures.push(`${label}: ${error.message}`);
    }
};

const targets = new Set();
for (const entry of Object.values(pkg.exports || {})) {
    if (typeof entry === 'string') targets.add(entry);
    else if (entry && typeof entry === 'object')
        for (const target of Object.values(entry)) if (typeof target === 'string') targets.add(target);
}
for (const match of patch.matchAll(/name:\s*["']?\.\/([^\s"']+)/g)) targets.add(`./${match[1]}`);
for (const target of targets) {
    await check(`non-empty ${target}`, async () => {
        const contents = await readFile(resolve(root, target), 'utf8');
        assert.ok(contents.trim().length, `${target} is empty`);
    });
}
await check('lib is included in package files', () => assert.ok(pkg.files?.includes('lib')));
await check('Node entry imports and matches package exports and Cordis patch', async () => {
    const entry = pkg.exports?.['.']?.default;
    assert.equal(entry, pkg.main);
    const patchEntries = [...patch.matchAll(/name:\s*["']?\.\/([^\s"']+)/g)].map(match => `./${match[1]}`);
    assert.ok(patchEntries.includes(entry), `Cordis patch must target ${entry}`);
    const plugin = await import(pathToFileURL(resolve(root, entry)).href);
    assert.equal(plugin.name, 'dsh-agents-router');
    assert.equal(typeof plugin.apply, 'function');
    assert.ok(Array.isArray(plugin.inject));
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
        }
    },
    URL,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    console
};
vm.runInNewContext(clientCode, sandbox, { filename: clientPath });
await check('exactly one ModuleLoader registration uses package id', () => {
    assert.equal(registration?.id, pkg.name);
    assert.equal(typeof registration?.factory, 'function');
});

if (registration) {
    const react = {
        Component: class {
            state = {};
        },
        useState: value => [value, () => {}],
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
    const rawContext = {
        locale: { preference: 'auto' },
        slots: {
            inject: (_slot, callback) => callback(),
            register: (options, component) => {
                registrations.push({ options, component });
                return () => {};
            }
        }
    };
    const allowed = new Set(client.inject || []);
    const strictContext = new Proxy(rawContext, {
        get(target, key, receiver) {
            if (typeof key === 'string' && !allowed.has(key)) throw new Error(`undeclared ctx property: ${key}`);
            return Reflect.get(target, key, receiver);
        }
    });
    await check('client context dependencies match declared inject', () => {
        assert.deepEqual([...allowed].toSorted(), ['locale', 'slots']);
        assert.ok(pkg.dsh.client.inject.every(id => typeof id === 'string'));
    });
    await check('apply reads only injected context properties', () => client.apply(strictContext));
    await check('bundle config registration is keyed by package id', () => {
        assert.ok(registrations.some(({ options }) => options.name === 'plugins.bundle.config' && options.key === pkg.name));
    });
    await check('plugin detail action filters unrelated bundles', () => {
        const action = registrations.find(({ options }) => options.name === 'plugins.detail.actions')?.component;
        assert.equal(typeof action, 'function');
        assert.equal(action({ subject: { kind: 'bundle', pkg: { name: '@unrelated/plugin' } } }), null);
    });
}

if (failures.length) {
    console.error(failures.map(failure => `FAIL ${failure}`).join('\n'));
    process.exitCode = 1;
} else console.log('Release verification OK');
