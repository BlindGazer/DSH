import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build, loadConfigFromFile, mergeConfig } from 'vite';
import { getDshClientExternals } from '../configs/vite.externals.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routerRoot = resolve(root, 'packages/dsh-agents-router');
const outputDir = resolve(root, 'node_modules/.cache/dsh-tree-shaking-control');
const entryId = resolve(routerRoot, '.tree-shaking-entry.js');
const dependencyId = 'virtual:dsh-tree-shaking-dependency';
const entryModuleId = '\0dsh-tree-shaking-entry';
const dependencyModuleId = '\0dsh-tree-shaking-dependency';
const loaderExternals = getDshClientExternals(['@deepseek-ai/cordis']);
const fixturePlugin = {
    name: 'dsh-tree-shaking-control',
    enforce: 'pre',
    resolveId(id) {
        if (id === entryId) return entryModuleId;
        if (id === dependencyId) return dependencyModuleId;
    },
    load(id) {
        if (id === entryModuleId) {
            const imports = loaderExternals.map(dependency => `import '${dependency}';`).join('\n');
            return `
                ${imports}
                import { USED_CONTROL } from '${dependencyId}';
                console.log(USED_CONTROL);
            `;
        }
        if (id === dependencyModuleId) {
            return `
                export const USED_CONTROL = 'DSH_TREE_SHAKING_USED_CONTROL';
                export const UNUSED_CONTROL = 'DSH_TREE_SHAKING_UNUSED_CONTROL';
            `;
        }
    }
};

const configFile = resolve(root, 'configs/packages/dsh-agents-router/vite.config.ts');
const loadedConfig = await loadConfigFromFile({ command: 'build', mode: 'production' }, configFile);
assert.ok(loadedConfig, 'router Vite config must load');

try {
    await rm(outputDir, { recursive: true, force: true });
    const config = mergeConfig(loadedConfig.config, {
        plugins: [fixturePlugin],
        build: {
            outDir: outputDir,
            emptyOutDir: true,
            lib: { entry: entryId }
        }
    });
    await build(config);
    const controlBundle = await readFile(resolve(outputDir, 'client.js'), 'utf8');
    assert.ok(controlBundle.includes('DSH_TREE_SHAKING_USED_CONTROL'));
    assert.ok(!controlBundle.includes('DSH_TREE_SHAKING_UNUSED_CONTROL'));
    for (const dependency of loaderExternals) {
        assert.ok(controlBundle.includes(`(${JSON.stringify(dependency)})`), `${dependency} must remain external`);
    }
    console.log('Tree-shaking control passed; unused export removed and loader dependencies remain external.');
} finally {
    await rm(outputDir, { recursive: true, force: true });
}

const bundles = [
    {
        name: '@kalex/dsh-core UI bundle',
        js: 'packages/dsh-core/lib/index.js',
        css: 'packages/dsh-core/lib/dsh-core.css'
    },
    {
        name: '@kalex/dsh-agents-router client',
        js: 'packages/dsh-agents-router/lib/client.js',
        css: 'packages/dsh-agents-router/lib/dsh-agents-router.css'
    },
    {
        name: '@kalex/dsh-proxy-provider client',
        js: 'packages/dsh-proxy-provider/lib/client.js',
        css: 'packages/dsh-proxy-provider/lib/dsh-proxy-provider.css'
    }
];

const formatSize = bytes => `${(bytes / 1000).toFixed(2)} kB`;
const reports = await Promise.all(
    bundles.map(async bundle => {
        const jsPath = resolve(root, bundle.js);
        const [jsContents, sourceMapContents, cssContents] = await Promise.all([
            readFile(jsPath),
            readFile(`${jsPath}.map`, 'utf8'),
            readFile(resolve(root, bundle.css))
        ]);
        const jsSourceMap = JSON.parse(sourceMapContents);
        return [
            `${bundle.name}: ${bundle.js.split('/').at(-1)} ${formatSize(jsContents.byteLength)} ` +
                `(gzip ${formatSize(gzipSync(jsContents).byteLength)}, ${jsSourceMap.sources.length} mapped sources)`,
            `${bundle.name}: ${bundle.css.split('/').at(-1)} ${formatSize(cssContents.byteLength)} ` +
                `(gzip ${formatSize(gzipSync(cssContents).byteLength)})`
        ].join('\n');
    })
);
console.log(reports.join('\n'));
