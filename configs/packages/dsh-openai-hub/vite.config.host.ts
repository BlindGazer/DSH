import { resolve } from 'node:path';
import { transform } from 'esbuild';
import { defineConfig } from 'vite';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-openai-hub');
export default defineConfig({
    ...createDshHostViteConfig({
        packageRoot,
        external: ['@deepseek-ai/dsh-config-editor', /^@earendil-works\/pi-ai(?:\/|$)/]
    }),
    plugins: [
        {
            name: 'openai-hub-standard-decorators',
            enforce: 'pre',
            transform(code, id) {
                if (!id.replaceAll('\\', '/').endsWith('/dsh-openai-hub/src/host/remote-service.ts')) return;
                return transform(code, {
                    sourcefile: id,
                    sourcemap: 'external',
                    loader: 'ts',
                    target: 'es2022',
                    tsconfigRaw: { compilerOptions: { experimentalDecorators: false } }
                });
            }
        }
    ]
});
