import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['test/**/*.{test,spec}.{ts,tsx,js,mjs}']
    },
    resolve: {
        alias: {
            '@kalex/dsh-core': resolve(import.meta.dirname, '../../../packages/dsh-core/src')
        }
    }
});
