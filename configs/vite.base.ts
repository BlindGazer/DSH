import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import MagicString from 'magic-string';
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import { getDshClientExternals } from './vite.externals.mjs';

/**
 * Плагин оборачивания клиентского бандла в формат загрузчика модулей DSH (window.__ModuleLoader__.load).
 */
export function dshModuleLoaderPlugin(packageName: string): Plugin {
    return {
        name: 'dsh-module-loader-wrapper',
        renderChunk(code, chunk) {
            if (chunk.isEntry) {
                const banner = `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => {\n'use strict';\nvar module = { exports: {} }; var exports = module.exports;\n`;
                const footer = '\nreturn module.exports; } });\n';
                const wrapped = new MagicString(code, { filename: chunk.fileName }).prepend(banner).append(footer);
                return { code: wrapped.toString(), map: wrapped.generateMap({ hires: true, includeContent: true }) };
            }
            return null;
        }
    };
}

/**
 * Создает конфигурацию Vite 8 для сборки клиентского React UI плагина DSH с Oxc и React Compiler.
 */
export function createDshClientViteConfig(options: {
    readonly packageRoot: string;
    readonly packageName: string;
    readonly entry?: string;
    readonly outFile?: string;
    readonly external?: readonly string[];
}): UserConfig {
    const monorepoRoot = resolve(options.packageRoot, '../..');
    const coreSrcPath = resolve(monorepoRoot, 'packages/dsh-core/src');

    return defineConfig({
        root: options.packageRoot,
        plugins: [react({ compiler: { target: '18' } }), dshModuleLoaderPlugin(options.packageName)],
        define: { 'process.env.NODE_ENV': JSON.stringify('production') },
        resolve: {
            alias: {
                '@kalex/dsh-core': coreSrcPath
            }
        },
        build: {
            outDir: resolve(options.packageRoot, 'lib'),
            emptyOutDir: false,
            sourcemap: false,
            minify: 'oxc',
            target: 'es2024',
            lib: {
                entry: resolve(options.packageRoot, options.entry ?? 'src/client.tsx'),
                formats: ['cjs'],
                fileName: () => options.outFile ?? 'client.js'
            },
            rollupOptions: {
                external: getDshClientExternals(options.external)
            }
        }
    });
}

/**
 * Создает конфигурацию Vite 8 для сборки серверного (Host / Node.js) модуля плагина DSH.
 */
export function createDshHostViteConfig(options: {
    readonly packageRoot: string;
    readonly entry?: string;
    readonly outFile?: string;
    readonly external?: readonly string[];
}): UserConfig {
    const monorepoRoot = resolve(options.packageRoot, '../..');
    const coreSrcPath = resolve(monorepoRoot, 'packages/dsh-core/src');

    return defineConfig({
        root: options.packageRoot,
        resolve: {
            alias: {
                '@kalex/dsh-core': coreSrcPath
            }
        },
        build: {
            outDir: resolve(options.packageRoot, 'lib'),
            emptyOutDir: false,
            sourcemap: false,
            minify: false,
            target: 'node22',
            lib: {
                entry: resolve(options.packageRoot, options.entry ?? 'src/index.ts'),
                formats: ['es'],
                fileName: () => options.outFile ?? 'index.js'
            },
            rollupOptions: {
                external: [/^node:/, 'undici', ...(options.external ?? [])]
            }
        }
    });
}
