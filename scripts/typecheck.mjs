import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageManager = process.platform === 'win32' ? 'pnpm.exe' : 'pnpm';
const commands = [
    ['dsh-core source', ['exec', 'tsc', '--noEmit', '--pretty', '-p', 'configs/packages/dsh-core/tsconfig.json']],
    ['agents-router source', ['exec', 'tsc', '--noEmit', '--pretty', '-p', 'configs/packages/dsh-agents-router/tsconfig.json']],
    ['proxy-provider source', ['exec', 'tsc', '--noEmit', '--pretty', '-p', 'configs/packages/dsh-proxy-provider/tsconfig.json']],
    ['dsh-core tests', ['exec', 'tsc', '--noEmit', '--pretty', '-p', 'configs/packages/dsh-core/tsconfig.test.json']],
    ['agents-router tests', ['exec', 'tsc', '--noEmit', '--pretty', '-p', 'configs/packages/dsh-agents-router/tsconfig.test.json']],
    ['proxy-provider tests', ['exec', 'tsc', '--noEmit', '--pretty', '-p', 'configs/packages/dsh-proxy-provider/tsconfig.test.json']]
];

let failed = false;
for (const [label, args] of commands) {
    console.log(`[typecheck] Checking ${label}...`);
    const result = spawnSync(packageManager, args, { cwd: rootDir, stdio: 'inherit' });
    if (result.error) {
        console.error(`[typecheck] Failed to run ${label}: ${result.error.message}`);
        failed = true;
    } else if (result.status !== 0) {
        console.error(`[typecheck] ${label} failed with exit code ${result.status ?? 'unknown'}`);
        failed = true;
    }
}

if (failed) {
    process.exitCode = 1;
} else {
    console.log('[typecheck] Source and test TypeScript checks passed.');
}
