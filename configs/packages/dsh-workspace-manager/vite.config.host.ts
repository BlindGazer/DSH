import { resolve } from 'node:path';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-workspace-manager');

export default createDshHostViteConfig({
    packageRoot,
    external: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-agent',
        '@deepseek-ai/dsh-llm',
        '@deepseek-ai/dsh-tools',
        '@deepseek-ai/dsh-host-webserver',
        '@deepseek-ai/dsh-config-editor',
        '@deepseek-ai/schemastery'
    ]
});
