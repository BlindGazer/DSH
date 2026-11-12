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
console.log('Release verification OK for @kalex/dsh-core');
