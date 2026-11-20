import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));

assert.equal(packageJson.name, '@kalex/dsh-openai-hub');
assert.equal(packageJson.author, 'gooosie');
assert.equal(packageJson.license, 'MIT');
assert.equal(packageJson.publishConfig?.access, 'public');

const publishFiles = packageJson.files;
assert.ok(Array.isArray(publishFiles));
for (const requiredPath of ['lib', 'src', 'cordis.patch.yml', 'README.md', 'docs', 'LICENSE', 'package.json']) {
    assert.ok(publishFiles.includes(requiredPath), `Published files must include ${requiredPath}`);
}
assert.ok(
    publishFiles.every(
        path => !/(^|\/)(?:\.git|node_modules|tests?)(?:\/|$)|appsettings\.Development\.json|(^|\/)\.env(?:\.|$)/i.test(path)
    ),
    'Published files must exclude repository metadata, dependencies, tests, and local secrets'
);
for (const requiredFile of ['README.md', 'LICENSE', 'cordis.patch.yml', 'docs/Security.md']) {
    await access(resolve(packageRoot, requiredFile));
}

const exportTargets = Object.values(packageJson.exports).flatMap(entry => (typeof entry === 'string' ? [entry] : Object.values(entry)));
for (const target of exportTargets) {
    await access(resolve(packageRoot, target));
}

execFileSync(process.execPath, ['--check', resolve(packageRoot, 'lib/index.js')]);

const libFiles = await readdir(resolve(packageRoot, 'lib'));
const assets = libFiles.includes('assets') ? await readdir(resolve(packageRoot, 'lib/assets')) : [];
assert.ok(!assets.some(file => /system-proxy|proxy-worker/.test(file)), 'OpenAI Hub must not ship proxy workers');
const host = await readFile(resolve(packageRoot, 'lib/index.js'), 'utf8');
assert.ok(
    !/ProxyMode|followHostProxy|useSystemProxy|worker_threads|from ["']undici["']/.test(host),
    'OpenAI Hub must not contain a proxy mechanism'
);

const license = await readFile(resolve(packageRoot, 'LICENSE'), 'utf8');
assert.ok(license.startsWith('MIT License\n'));

console.log('Release verification OK for @kalex/dsh-openai-hub');
