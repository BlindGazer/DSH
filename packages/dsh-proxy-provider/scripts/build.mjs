import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await rm(resolve(root, 'lib'), { recursive: true, force: true });

await build({
    root,
    configFile: resolve(root, '../../configs/packages/dsh-proxy-provider/vite.config.host.ts')
});

await build({
    root,
    configFile: resolve(root, '../../configs/packages/dsh-proxy-provider/vite.config.ts')
});

console.log('Built @kalex/dsh-proxy-provider');
