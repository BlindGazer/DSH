import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['packages/**/test/**/*.{test,spec}.{js,mjs,ts,tsx}']
    },
    resolve: {
        alias: {
            '@kalex/dsh-core': resolve(__dirname, 'packages/dsh-core/src')
        }
    }
});
