import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Запуск через установленный runtime DSH (для Electron нужен ELECTRON_RUN_AS_NODE=1).
// Используется изолированный Cordis Context без подключения к рабочему профилю и его изменения.
assert.ok(process.env.DSH_INSTALL_DIR, 'DSH_INSTALL_DIR must identify the running installation');
const installed = createRequire(join(process.env.DSH_INSTALL_DIR, 'package.json'));
const loadInstalled = name => import(pathToFileURL(installed.resolve(name)).href);
const { Context } = await loadInstalled('@deepseek-ai/cordis');
const { TypertRegistry } = await loadInstalled('@deepseek-ai/dsh-typert-registry');
const { TypertGatewayService } = await loadInstalled('@deepseek-ai/dsh-api-gateway');
const host = await import(new URL('../lib/host.js', import.meta.url).href);
const { TYPERT } = await import(new URL('../lib/remote.js', import.meta.url).href);
const { createOptionalLogger } = await import(new URL('../../dsh-logger-core/lib/index.js', import.meta.url).href);
const ctx = new Context();
const controller = new AbortController();
const peer = {
    id: 'logger-built-test',
    ctx,
    principal: { kind: 'owner' },
    signal: controller.signal,
    interactions: 'none',
    dispose: async () => controller.abort()
};
let edits = 0;
let raw = { enabled: false };
const entry = { options: { name: '@kalex/dsh-logger' } };
try {
    const registry = new TypertRegistry(ctx);
    registry.register(TYPERT);
    ctx.provide('configEditor', {
        entries: () => [entry],
        edit: async (target, change) => {
            assert.equal(target, entry);
            raw = change(raw, {});
            edits++;
        }
    });
    // Логгер отключён, путь неизменен: файлы не создаются, очистка каталога не запускается.
    const packageNames = ['@kalex/dsh-agents-router', '@kalex/dsh-openai-hub', '@kalex/dsh-proxy-provider'];
    let starts = 0;
    for (const packageName of packageNames) {
        await ctx.plugin({
            name: `file:///installed/${packageName}/lib/index.js`,
            apply(context) {
                starts++;
                createOptionalLogger(context, packageName).record({ event: 'before-manager' });
            }
        });
    }
    let manager = await ctx.plugin(host, { enabled: false });
    await ctx.plugin({ name: 'flush-logger-bindings', apply() {} });
    const gateway = new TypertGatewayService(ctx, {});
    const invoke = (method, args) => gateway.invoke({ namespace: 'loggerSettings', method, args, peer });
    const before = await invoke('read', {});
    assert.deepEqual(before.packageNames, packageNames);
    await manager.dispose();
    manager = await ctx.plugin(host, { enabled: false });
    await ctx.plugin({ name: 'flush-logger-rebinding', apply() {} });
    assert.deepEqual((await invoke('read', {})).packageNames, packageNames);
    assert.equal(starts, packageNames.length, 'manager reload must not restart consumers');
    const input = {
        config: { ...before.config, level: 'warn' },
        expectedConfig: before.config,
        confirmPathChange: false
    };
    const saved = await invoke('save', { input });
    assert.equal(saved.config.enabled, false);
    assert.equal(saved.config.level, 'warn');
    assert.equal(raw.level, 'warn');
    assert.equal(edits, 1);
    assert.deepEqual((await invoke('read', {})).config, saved.config);
    await assert.rejects(invoke('save', { request: input }), error => error.code === 'gateway/arguments-invalid');
    await assert.rejects(invoke('save', { input: {} }), error => error.code === 'gateway/input-invalid');
    assert.equal(edits, 1, 'invalid wire arguments must never reach the editor');
    console.log(
        'PASS built logger read/save via installed Typert gateway; exact input mapping; invalid fields rejected; in-memory editor only'
    );
} finally {
    await peer.dispose();
    await ctx.fiber.dispose();
}
