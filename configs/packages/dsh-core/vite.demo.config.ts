import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { getInternalSourceAliases } from '../../source-aliases.ts';

export default defineConfig({
    root: resolve(import.meta.dirname, '../../../packages/dsh-core/demo'),
    plugins: [react({ compiler: { target: '18' } })],
    resolve: { alias: getInternalSourceAliases(resolve(import.meta.dirname, '../../..')) },
    server: {
        host: '127.0.0.1'
    }
});
