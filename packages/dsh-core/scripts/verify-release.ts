import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const jsCode = readFileSync(resolve(packageRoot, 'lib/index.js'), 'utf8');

assert.equal(pkg.name, '@kalex/dsh-core');
assert.ok(jsCode.includes('ThemedSelect'), 'lib/index.js must export ThemedSelect');
assert.ok(jsCode.includes('SwitchControl'), 'lib/index.js must export SwitchControl');
assert.ok(jsCode.includes('registerDshTheme'), 'lib/index.js must export registerDshTheme');
assert.ok(jsCode.includes('useEffectiveTheme'), 'lib/index.js must export useEffectiveTheme');
// The published ESM entry must execute without a bundler-provided require shim.
const api = await import(new URL('../lib/index.js', import.meta.url).href);
for (const name of ['ThemedSelect', 'SwitchControl', 'registerDshTheme', 'useEffectiveTheme']) {
    assert.equal(typeof api[name], 'function', `Published export ${name} must execute as ESM`);
}
assert.ok(api.buildCoreThemeStyles().length > 0, 'compiled theme data must be present');
assert.ok(readFileSync(resolve(packageRoot, 'lib/dsh-core.css'), 'utf8').length > 0, 'compiled stylesheet must be present');
console.log('Release verification OK for @kalex/dsh-core');
