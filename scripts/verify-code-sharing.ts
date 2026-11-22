import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, loadConfigFromFile } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consumers = ['dsh-agents-router', 'dsh-proxy-provider', 'dsh-openai-hub', 'dsh-workspace-manager'];
const targets = consumers.flatMap(name => [
    { name, side: 'host', config: 'vite.config.host.ts' },
    { name, side: 'client', config: 'vite.config.ts' }
]);
targets.push(
    { name: 'dsh-core', side: 'client', config: 'vite.config.ts' },
    { name: 'dsh-logger', side: 'host', config: 'vite.config.ts' },
    { name: 'dsh-logger', side: 'client', config: 'vite.client.config.ts' },
    { name: 'dsh-logger-core', side: 'shared', config: 'vite.config.ts' }
);

for (const target of targets) {
    const configPath = resolve(root, 'configs/packages', target.name, target.config);
    const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, configPath);
    assert.ok(loaded, configPath);
    let checked = false;
    const result = await build({
        ...loaded.config,
        configFile: false,
        logLevel: 'warn',
        plugins: [
            ...(loaded.config.plugins ?? []),
            {
                name: 'verify-internal-source-graph',
                generateBundle(_options, bundle) {
                    const chunks = Object.values(bundle).filter(output => output.type === 'chunk');
                    const modules = chunks.flatMap(chunk => Object.keys(chunk.modules)).map(id => id.replaceAll('\\', '/'));
                    const externalIds = [...this.getModuleIds()].filter(id => this.getModuleInfo(id)?.isExternal);
                    for (const id of externalIds) {
                        assert.ok(!id.startsWith('@kalex/dsh-'), `${target.name}: unresolved internal external ${id}`);
                        assert.ok(!id.replaceAll('\\', '/').includes('/packages/'), `${target.name}: external sibling source ${id}`);
                    }
                    for (const id of modules) {
                        assert.ok(!/\/packages\/dsh-[^/]+\/lib\//.test(id), `${target.name}: consumes generated internal code ${id}`);
                        if (consumers.includes(target.name)) {
                            assert.ok(!id.includes('/packages/dsh-logger/'), `${target.name}: bundles logger implementation ${id}`);
                        }
                        if (target.side === 'client') {
                            assert.ok(!/\/packages\/dsh-[^/]+\/src\/host\//.test(id), `${target.name}: Host code in client ${id}`);
                        }
                        if (target.side === 'host') {
                            assert.ok(!/\/packages\/dsh-[^/]+\/src\/client\//.test(id), `${target.name}: Client code in Host ${id}`);
                        }
                        if (target.side === 'shared') {
                            assert.ok(id.includes('/packages/dsh-logger-core/src/'), `logger-core: non-core module ${id}`);
                        }
                    }
                    if (target.side === 'client' || target.side === 'shared') {
                        assert.ok(!externalIds.some(id => id.startsWith('node:')), `${target.name}: Node external in browser-safe graph`);
                    }
                    if (target.side === 'client') {
                        assert.ok(
                            modules.some(id => id.includes('/packages/dsh-core/src/')),
                            `${target.name}: required Core sources missing`
                        );
                    }
                    if (target.side === 'shared') assert.equal(externalIds.length, 0, 'logger-core must have no runtime dependencies');
                    console.log(`[source-graph] ${target.name}/${target.side}: ${modules.length} rendered modules; no internal externals`);
                    checked = true;
                }
            }
        ],
        build: { ...loaded.config.build, write: false }
    });
    assert.ok(checked, `${target.name}: no output graph inspected`);
    if (target.side === 'client') {
        // Vite finalizes extracted CSS after ordinary generateBundle hooks.
        const output = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
        assert.ok(
            output.some(item => item.type === 'asset' && item.fileName.endsWith('.css') && item.source.length > 0),
            `${target.name}: required stylesheet missing`
        );
    }
}

// Build a real public helper with the production client configuration: unrelated core
// helpers must disappear, and the resulting no-op must execute without DSH or React.
const configPath = resolve(root, 'configs/packages/dsh-agents-router/vite.config.ts');
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, configPath);
assert.ok(loaded);
const entry = resolve(root, 'packages/dsh-agents-router/.logger-minimal-consumer.js');
const virtualEntry = '\0logger-minimal-consumer';
const output = await build({
    ...loaded.config,
    configFile: false,
    logLevel: 'warn',
    plugins: [
        ...(loaded.config.plugins ?? []),
        {
            name: 'logger-minimal-consumer',
            resolveId(id) {
                if (id === entry) return virtualEntry;
            },
            load(id) {
                if (id === virtualEntry) return "export { NOOP_LOGGER } from '@kalex/dsh-logger-core';";
            }
        }
    ],
    build: {
        ...loaded.config.build,
        write: false,
        lib: { ...loaded.config.build.lib, entry }
    }
});
const chunks = (Array.isArray(output) ? output : [output]).flatMap(result => result.output).filter(item => item.type === 'chunk');
assert.equal(chunks.length, 1);
const minimal = chunks[0];
assert.ok(!Object.keys(minimal.modules).some(id => /factory\.[jt]s$/.test(id)), 'unused facade/binding module must be tree-shaken');
let api: { NOOP_LOGGER: { record: (record: { event: string }) => void } } | undefined;
const window = {
    __ModuleLoader__: {
        load({ factory }) {
            api = factory(id => {
                throw new Error(`Unexpected dependency: ${id}`);
            });
        }
    }
};
new Function('window', minimal.code)(window);
assert.equal(typeof api.NOOP_LOGGER.record, 'function');
assert.equal(api.NOOP_LOGGER.record({ event: 'outside-dsh' }), undefined);
console.log('[source-graph] minimal consumer: no-op works; unrelated binding/facade implementation excluded');
