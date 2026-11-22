import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { getInternalSourceAliases } from '../../source-aliases.ts';
import { reactExternals } from '../../vite.externals.ts';

export default defineConfig({
    root: resolve(import.meta.dirname, '../../../packages/dsh-core'),
    resolve: { alias: getInternalSourceAliases(resolve(import.meta.dirname, '../../..')) },
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
            external: [...reactExternals, 'react-compiler-runtime']
        }
    }
});
