import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'src');
const hostBuildRoot = resolve(root, 'node_modules/.cache/host-build');
const hostOnly = process.argv.includes('--host-only');
const compilerArgs = [
    'exec',
    'tsc',
    '--ignoreConfig',
    '--noCheck',
    '--target',
    'ES2024',
    '--module',
    'ESNext',
    '--moduleResolution',
    'bundler',
    '--rootDir',
    sourceRoot,
    '--outDir',
    hostBuildRoot,
    resolve(sourceRoot, 'index.ts'),
    resolve(sourceRoot, 'host/system-proxy-worker.ts')
];

if (!hostOnly) await rm(resolve(root, 'lib'), { recursive: true, force: true });
await rm(hostBuildRoot, { recursive: true, force: true });

try {
    execFileSync(process.env.npm_execpath ?? (process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'), compilerArgs, {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32' && process.env.npm_execpath === undefined
    });
    process.env.DSH_OPENAI_CODEX_HOST_ENTRY = resolve(hostBuildRoot, 'index.js');
    await build({
        root,
        configFile: resolve(root, '../../configs/packages/dsh-openai-codex-provider/vite.config.host.ts')
    });
    execFileSync(process.execPath, ['--check', resolve(root, 'lib/index.js')], { stdio: 'inherit' });
} finally {
    delete process.env.DSH_OPENAI_CODEX_HOST_ENTRY;
    await rm(hostBuildRoot, { recursive: true, force: true });
}

if (!process.argv.includes('--host-only')) {
    await build({
        root,
        configFile: resolve(root, '../../configs/packages/dsh-openai-codex-provider/vite.config.ts')
    });
    await build({
        root,
        configFile: resolve(root, '../../configs/packages/dsh-openai-codex-provider/vite.config.remote.ts')
    });
}

console.log('Built @kalex/dsh-openai-codex-provider');
