import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { reactExternals } from '../../vite.externals.mjs';

export default defineConfig({
    plugins: [react({ compiler: { target: '18' } })],
    build: {
        outDir: 'lib',
        emptyOutDir: true,
        sourcemap: false,
        minify: 'oxc',
        lib: {
            entry: resolve(import.meta.dirname, '../../../packages/dsh-core/src/index.ts'),
            formats: ['es'],
            fileName: () => 'index.js'
        },
        rollupOptions: {
            external: reactExternals
        }
    }
});
