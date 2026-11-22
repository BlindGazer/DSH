import { resolve } from 'node:path';
import { createDshClientViteConfig } from '../../vite.base.ts';

export default createDshClientViteConfig({
    packageRoot: resolve(import.meta.dirname, '../../../packages/dsh-logger'),
    packageName: '@kalex/dsh-logger',
    entry: 'src/client/index.tsx'
});
