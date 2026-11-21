import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const syncResult = spawnSync(process.execPath, ['scripts/sync-demo-styles.mjs'], {
    cwd: packageRoot,
    stdio: 'inherit'
});

if (syncResult.status !== 0) {
    process.exitCode = syncResult.status ?? 1;
} else {
    const viteEntry = resolve(packageRoot, '../../node_modules/vite/bin/vite.js');
    const viteProcess = spawn(
        process.execPath,
        [
            viteEntry,
            '--config',
            '../../configs/packages/dsh-core/vite.demo.config.ts',
            ...process.argv.slice(2).filter(argument => argument !== '--')
        ],
        {
            cwd: packageRoot,
            stdio: 'inherit'
        }
    );
    viteProcess.on('exit', (code, signal) => {
        process.exitCode = code ?? (signal === undefined ? 1 : 0);
    });
}
