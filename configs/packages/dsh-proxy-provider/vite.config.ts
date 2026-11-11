import { resolve } from 'node:path';
import { createDshClientViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-proxy-provider');

export default createDshClientViteConfig({
    packageRoot,
    packageName: '@kalex/dsh-proxy-provider'
});
