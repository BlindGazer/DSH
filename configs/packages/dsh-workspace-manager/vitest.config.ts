import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.{test,spec}.{ts,tsx,js,mjs}'],
        setupFiles: [resolve(import.meta.dirname, '../../../packages/dsh-workspace-manager/tests/setup.ts')]
    },
    resolve: {
        alias: {
            '@kalex/dsh-core': resolve(import.meta.dirname, '../../../packages/dsh-core/src')
        }
    }
});
