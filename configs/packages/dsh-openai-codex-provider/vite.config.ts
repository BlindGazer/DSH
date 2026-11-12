import { resolve } from 'node:path';
import { createDshClientViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-openai-codex-provider');

export default createDshClientViteConfig({
    packageRoot,
    packageName: '@kalex/dsh-openai-codex-provider'
});
