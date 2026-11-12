import { resolve } from 'node:path';
import { createDshClientViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-workspace-manager');

export default createDshClientViteConfig({
    packageRoot,
    packageName: '@kalex/dsh-workspace-manager',
    external: [
        '@deepseek-ai/cordis',
        '@deepseek-ai/dsh-api-workspace-controller/client',
        '@deepseek-ai/dsh-client-ui-workspace/client',
        '@deepseek-ai/dsh-client-ui-settings/client',
        '@deepseek-ai/dsh-client-ui-layout/client',
        '@deepseek-ai/dsh-client-ui-renderer/client'
    ]
});
