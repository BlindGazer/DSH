import { resolve } from 'node:path';
import { transform } from 'esbuild';
import { defineConfig } from 'vite';
import { getInternalSourceAliases } from '../../source-aliases.ts';

export default defineConfig({
    root: resolve(import.meta.dirname, '../../../packages/dsh-logger'),
    resolve: { alias: getInternalSourceAliases(resolve(import.meta.dirname, '../../..')) },
    plugins: [
        {
            name: 'logger-standard-decorators',
            enforce: 'pre',
            transform(code, id) {
                if (!id.replaceAll('\\', '/').endsWith('/src/host/remote-service.ts')) return;
                return transform(code, {
                    sourcefile: id,
                    sourcemap: 'external',
                    loader: 'ts',
                    target: 'es2022',
                    tsconfigRaw: { compilerOptions: { experimentalDecorators: false } }
                });
            }
        }
    ],
    build: {
        target: 'es2022',
        outDir: 'lib',
        emptyOutDir: true,
        lib: {
            entry: {
                index: resolve(import.meta.dirname, '../../../packages/dsh-logger/src/index.ts'),
                plugin: resolve(import.meta.dirname, '../../../packages/dsh-logger/src/plugin.ts'),
                host: resolve(import.meta.dirname, '../../../packages/dsh-logger/src/host/index.ts'),
                remote: resolve(import.meta.dirname, '../../../packages/dsh-logger/src/shared/remote.ts')
            },
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.js`
        },
        rollupOptions: {
            external: id => id.startsWith('node:') || id.startsWith('@deepseek-ai/') || id === 'react' || id.startsWith('react/')
        }
    }
});
