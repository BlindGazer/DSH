import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const packages = [
    'dsh-core',
    'dsh-logger-core',
    'dsh-logger',
    'dsh-agents-router',
    'dsh-proxy-provider',
    'dsh-openai-hub',
    'dsh-workspace-manager'
];
let failed = false;
for (const packageName of packages) {
    for (const kind of ['source', 'tests']) {
        const config = kind === 'source' ? 'tsconfig.json' : 'tsconfig.test.json';
        const label = `${packageName} ${kind}`;
        console.log(`[typecheck] Checking ${label}...`);
        const result = spawnSync(
            process.execPath,
            [
                resolve(rootDir, 'node_modules/typescript/bin/tsc'),
                '--noEmit',
                '--pretty',
                '-p',
                `configs/packages/${packageName}/${config}`
            ],
            { cwd: rootDir, stdio: 'inherit' }
        );
        if (result.error) {
            console.error(`[typecheck] Failed to run ${label}: ${result.error.message}`);
            failed = true;
        } else if (result.status !== 0) {
            console.error(`[typecheck] ${label} failed with exit code ${result.status ?? 'unknown'}`);
            failed = true;
        }
    }
}

if (failed) process.exitCode = 1;
else console.log('[typecheck] Source and test TypeScript checks passed without emitting files.');
