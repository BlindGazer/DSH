import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-openai-codex-provider');

export default defineConfig({
    ...createDshHostViteConfig({ packageRoot }),
    worker: {
        format: 'es',
        rollupOptions: { external: [/^node:/, 'undici'] }
    }
});
