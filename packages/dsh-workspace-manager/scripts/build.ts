import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

const packageRoot = resolve(import.meta.dirname, '..');

await rm(resolve(packageRoot, 'lib'), { recursive: true, force: true });
await build({ root: packageRoot, configFile: resolve(packageRoot, '../../configs/packages/dsh-workspace-manager/vite.config.host.ts') });
await build({ root: packageRoot, configFile: resolve(packageRoot, '../../configs/packages/dsh-workspace-manager/vite.config.ts') });
console.log('Built @kalex/dsh-workspace-manager host and client bundles.');
