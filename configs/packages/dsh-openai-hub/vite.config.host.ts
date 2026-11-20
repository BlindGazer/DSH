import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { createDshHostViteConfig } from '../../vite.base.ts';

const packageRoot = resolve(import.meta.dirname, '../../../packages/dsh-openai-hub');
export default defineConfig(
    createDshHostViteConfig({
        packageRoot,
        entry: process.env.DSH_OPENAI_HUB_HOST_ENTRY ?? 'src/index.ts',
        external: ['@deepseek-ai/dsh-config-editor', /^@earendil-works\/pi-ai(?:\/|$)/]
    })
);
