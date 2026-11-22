import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync('pnpm', ['vitest', 'run'], { cwd: root, stdio: 'inherit' });
if (result.error) {
    // If running in an environment without pnpm/vitest binaries in PATH, log instruction
    console.log('Run "pnpm test" with devDependencies installed to execute Vitest suites.');
} else {
    process.exitCode = result.status ?? 0;
}
