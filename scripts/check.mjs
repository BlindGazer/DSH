import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.css', '.scss', '.yml', '.yaml']);
const ignoredDirs = new Set(['.git', 'node_modules', 'lib', 'dist']);
const ignoredFiles = new Set(['appsettings.Development.json']);
const checkDirs = ['packages', 'scripts', 'configs'];

function findEncodingViolations(dirPath) {
    const violations = [];
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        if (ignoredDirs.has(entry.name)) continue;
        const fullPath = join(dirPath, entry.name);
        if (entry.isDirectory()) {
            violations.push(...findEncodingViolations(fullPath));
            continue;
        }
        if (ignoredFiles.has(entry.name) || !textExtensions.has(extname(entry.name))) continue;

        const content = readFileSync(fullPath);
        const path = relative(rootDir, fullPath).replaceAll('\\', '/');
        if (content.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
            violations.push(`${path}: UTF-8 BOM is not allowed`);
        }
        if (content.includes(Buffer.from('\r\n'))) {
            violations.push(`${path}: CRLF line endings are not allowed`);
        }
    }
    return violations;
}

function runRequiredCommand(name, args) {
    const command = process.platform === 'win32' ? (process.env.npm_execpath ?? 'pnpm.exe') : 'pnpm';
    const result = spawnSync(command, args, { cwd: rootDir, stdio: 'inherit' });

    if (result.error) {
        console.error(`[check] Failed to run ${name}: ${result.error.message}`);
        return false;
    }
    if (result.status !== 0) {
        console.error(`[check] ${name} failed with exit code ${result.status ?? 'unknown'}`);
        return false;
    }
    return true;
}

const violations = checkDirs.flatMap(dir => findEncodingViolations(resolve(rootDir, dir)));
for (const violation of violations) console.error(`[check] ${violation}`);

let failed = violations.length > 0;
const tools = [
    ['TypeScript', ['typecheck']],
    ['Lint', ['lint']]
];

for (const [name, args] of tools) {
    if (!runRequiredCommand(name, args)) failed = true;
}

if (failed) {
    console.error('[check] Required checks failed. See diagnostics above.');
    process.exitCode = 1;
} else {
    console.log('[check] Encoding, TypeScript, Oxlint, and Biome checks passed.');
}
