import { resolve } from 'node:path';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-agents-router');

export default createDshHostViteConfig({
    packageRoot,
    external: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-agent',
        '@deepseek-ai/dsh-llm',
        '@deepseek-ai/dsh-skill',
        '@deepseek-ai/dsh-tools',
        '@deepseek-ai/dsh-system-prompt',
        '@deepseek-ai/dsh-typert-protocol',
        '@deepseek-ai/dsh-working-directory'
    ]
});
