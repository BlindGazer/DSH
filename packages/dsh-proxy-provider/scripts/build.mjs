import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await rm(resolve(root, 'lib'), { recursive: true, force: true });

// 1. Build Host bundle with Vite 8
await build({
    root,
    configFile: resolve(root, '../../configs/packages/dsh-proxy-provider/vite.config.host.ts')
});

// 2. Build Client bundle with Vite 8 + React Compiler + Oxc minifier
await build({
    root,
    configFile: resolve(root, '../../configs/packages/dsh-proxy-provider/vite.config.ts')
});

console.log('Built @kalex/dsh-proxy-provider via Vite 8 (Host + Client)');
