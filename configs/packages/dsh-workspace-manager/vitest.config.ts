import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { getInternalSourceAliases } from '../../source-aliases.ts';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        isolate: false,
        include: ['tests/**/*.{test,spec}.{ts,tsx,js,mjs}'],
        setupFiles: [resolve(import.meta.dirname, '../../../packages/dsh-workspace-manager/tests/setup.ts')]
    },
    resolve: {
        alias: getInternalSourceAliases(resolve(import.meta.dirname, '../../..'))
    }
});
