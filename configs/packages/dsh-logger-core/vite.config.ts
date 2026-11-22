import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    root: resolve(import.meta.dirname, '../../../packages/dsh-logger-core'),
    build: {
        outDir: 'lib',
        emptyOutDir: true,
        lib: {
            entry: resolve(import.meta.dirname, '../../../packages/dsh-logger-core/src/index.ts'),
            formats: ['es'],
            fileName: () => 'index.js'
        },
        target: 'es2022',
        minify: false
    }
});
