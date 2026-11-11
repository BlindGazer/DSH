import { resolve } from 'node:path';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-proxy-provider');

export default createDshHostViteConfig({
    packageRoot
});
