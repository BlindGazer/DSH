import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as Cordis from '@deepseek-ai/cordis';
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactDom from 'react-dom';
import * as ReactDomClient from 'react-dom/client';

interface ClientExports {
    readonly apply: (...args: object[]) => void;
    readonly inject: readonly string[];
}

interface PluginRegistration {
    readonly id: string;
    readonly factory: (loadModule: (specifier: string) => object) => ClientExports;
}

interface ModuleLoader {
    readonly load: (registration: PluginRegistration) => void;
}

interface TestWindow {
    readonly __ModuleLoader__: ModuleLoader;
}

interface TestSandbox {
    readonly window: TestWindow;
}

const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const registrations: PluginRegistration[] = [];
const sandbox: TestSandbox = {
    window: {
        __ModuleLoader__: {
            load: registration => registrations.push(registration)
        }
    }
};

runInNewContext(source, sandbox, { filename: 'client.js' });

assert.equal(registrations.length, 1);
const [{ id, factory }] = registrations;
assert.equal(id, '@kalex/dsh-workspace-manager');
assert.equal(typeof factory, 'function');

const sharedModules = new Map<string, object>([
    ['react', React],
    ['react/jsx-runtime', ReactJsxRuntime],
    ['react-dom', ReactDom],
    ['react-dom/client', ReactDomClient],
    ['@deepseek-ai/cordis', Cordis]
]);
const requests = new Set<string>();
const exports = factory(specifier => {
    const sharedModule = sharedModules.get(specifier);
    assert.ok(sharedModule, `Unshared client dependency: ${specifier}`);
    requests.add(specifier);
    return sharedModule;
});

assert.equal(typeof exports.apply, 'function');
assert.ok(exports.inject.includes('slots'));
assert.ok(requests.has('react'));
assert.ok(requests.has('react/jsx-runtime'));

console.log('Client bundle registers and materializes with DSH shared modules.');
