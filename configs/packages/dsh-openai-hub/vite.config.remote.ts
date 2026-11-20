import { resolve } from 'node:path';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-openai-hub');

export default createDshHostViteConfig({
    packageRoot,
    entry: 'src/remote.ts',
    outFile: 'remote.js',
    external: ['zod']
});
