import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageManager = process.platform === 'win32' ? (process.env.npm_execpath ?? 'pnpm.exe') : 'pnpm';
const commands = [
    [
        'Oxlint',
        [
            'exec',
            'oxlint',
            '-c',
            'configs/oxlint.json',
            '--ignore-pattern',
            '**/lib/**',
            '--ignore-pattern',
            '**/dist/**',
            '--ignore-pattern',
            '**/node_modules/**',
            'scripts'
        ]
    ],
    ['Biome', ['exec', 'biome', 'check', '--config-path=configs/biome.json', 'packages', 'scripts', 'configs']]
];

for (const [name, args] of commands) {
    console.log(`[lint] Running ${name}...`);
    const result = spawnSync(packageManager, args, { cwd: rootDir, stdio: 'inherit' });
    if (result.error) {
        console.error(`[lint] Failed to run ${name}: ${result.error.message}`);
        process.exitCode = 1;
        break;
    }
    if (result.status !== 0) {
        console.error(`[lint] ${name} failed with exit code ${result.status ?? 'unknown'}`);
        process.exitCode = 1;
        break;
    }
}
