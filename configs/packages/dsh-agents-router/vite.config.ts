import { resolve } from 'node:path';
import { createDshClientViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-agents-router');

export default createDshClientViteConfig({
    packageRoot,
    packageName: '@kalex/dsh-agents-router',
    external: ['@deepseek-ai/cordis']
});
