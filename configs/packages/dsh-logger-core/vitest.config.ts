import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { getInternalSourceAliases } from '../../source-aliases.ts';

export default defineConfig({
    root: resolve(import.meta.dirname, '../../../packages/dsh-logger-core'),
    test: {
        environment: 'node',
        globals: true,
        include: ['test/**/*.{test,spec}.{ts,tsx,js,mjs}']
    },
    resolve: {
        alias: getInternalSourceAliases(resolve(import.meta.dirname, '../../..'))
    }
});
