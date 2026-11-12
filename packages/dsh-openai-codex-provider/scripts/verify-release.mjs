import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));

assert.equal(packageJson.name, '@kalex/dsh-openai-codex-provider');
assert.equal(packageJson.author, 'gooosie');
assert.equal(packageJson.license, 'MIT');
assert.equal(packageJson.publishConfig?.access, 'public');

const publishFiles = packageJson.files;
assert.ok(Array.isArray(publishFiles));
for (const requiredPath of ['lib', 'src', 'cordis.patch.yml', 'README.md', 'doc', 'LICENSE', 'package.json']) {
    assert.ok(publishFiles.includes(requiredPath), `Published files must include ${requiredPath}`);
}
assert.ok(
    publishFiles.every(
        path => !/(^|\/)(?:\.git|node_modules|tests?)(?:\/|$)|appsettings\.Development\.json|(^|\/)\.env(?:\.|$)/i.test(path)
    ),
    'Published files must exclude repository metadata, dependencies, tests, and local secrets'
);
for (const requiredFile of ['README.md', 'LICENSE', 'cordis.patch.yml', 'docs/security.md']) {
    await access(resolve(packageRoot, requiredFile));
}

const exportTargets = Object.values(packageJson.exports).flatMap(entry => (typeof entry === 'string' ? [entry] : Object.values(entry)));
for (const target of exportTargets) {
    await access(resolve(packageRoot, target));
}

const workerFile = (await readdir(resolve(packageRoot, 'lib/assets'))).find(file => /^system-proxy-worker-.+\.js$/.test(file));
assert.ok(workerFile, 'The Node system-proxy worker must be present in the package');
const workerSource = await readFile(resolve(packageRoot, 'lib/assets', workerFile), 'utf8');
assert.match(workerSource, /from ["']node:worker_threads["']/);
assert.match(workerSource, /from ["']undici["']/);
assert.ok(!workerSource.includes('__vite-browser-external'), 'The Node worker must not contain browser external shims');

const license = await readFile(resolve(packageRoot, 'LICENSE'), 'utf8');
assert.ok(license.startsWith('MIT License\n'));

console.log('Release verification OK for @kalex/dsh-openai-codex-provider');
