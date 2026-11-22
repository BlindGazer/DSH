import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hostOnly = process.argv.includes('--host-only');
const output = resolve(root, 'lib');
if (output !== resolve(root, './lib')) throw new Error('Unexpected build output path.');
if (!hostOnly) await rm(output, { recursive: true, force: true });

// Vite transforms source and standard decorators; tsc is reserved for noEmit checks/types.
await build({
    root,
    configFile: resolve(root, '../../configs/packages/dsh-openai-hub/vite.config.host.ts')
});
execFileSync(process.execPath, ['--check', resolve(output, 'index.js')], { stdio: 'inherit' });

if (!hostOnly) {
    await build({
        root,
        configFile: resolve(root, '../../configs/packages/dsh-openai-hub/vite.config.ts')
    });
    await build({
        root,
        configFile: resolve(root, '../../configs/packages/dsh-openai-hub/vite.config.remote.ts')
    });
}

console.log('Built @kalex/dsh-openai-hub');
