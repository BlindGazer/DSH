import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { getInternalSourceAliases } from '../../source-aliases.ts';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        isolate: false,
        include: ['test/**/*.{test,spec}.{ts,tsx,js,mjs}']
    },
    resolve: {
        alias: getInternalSourceAliases(resolve(import.meta.dirname, '../../..'))
    }
});
