import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.css', '.scss', '.yml', '.yaml']);
const ignoredDirs = new Set(['.git', 'node_modules', 'lib', 'dist']);
const ignoredFiles = new Set(['appsettings.Development.json']);
const fixDirs = ['packages', 'scripts', 'configs'];

function normalizeEncodingAndLineEndings(dirPath) {
    let fixedCount = 0;
    for (const entry of readdirSync(dirPath)) {
        if (ignoredDirs.has(entry)) continue;
        const fullPath = join(dirPath, entry);
        if (statSync(fullPath).isDirectory()) {
            fixedCount += normalizeEncodingAndLineEndings(fullPath);
            continue;
        }
        if (ignoredFiles.has(entry) || !textExtensions.has(extname(entry))) continue;

        const raw = readFileSync(fullPath);
        const hasBom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
        const text = (hasBom ? raw.subarray(3) : raw).toString('utf8');
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (hasBom || normalized !== text) {
            writeFileSync(fullPath, normalized, 'utf8');
            fixedCount += 1;
        }
    }
    return fixedCount;
}

function runRequiredTool(name, args) {
    const command = process.platform === 'win32' ? 'pnpm.exe' : 'pnpm';
    const result = spawnSync(command, ['exec', name, ...args], {
        cwd: rootDir,
        stdio: 'inherit'
    });

    if (result.error) {
        console.error(`[fix] Failed to run ${name}: ${result.error.message}`);
        return false;
    }
    if (result.status !== 0) {
        console.error(`[fix] ${name} failed with exit code ${result.status ?? 'unknown'}`);
        return false;
    }
    return true;
}

function runCheck() {
    const command = process.platform === 'win32' ? 'pnpm.exe' : 'pnpm';
    const result = spawnSync(command, ['check'], {
        cwd: rootDir,
        stdio: 'inherit'
    });
    if (result.error) {
        console.error(`[fix] Failed to run pnpm check: ${result.error.message}`);
        return false;
    }
    if (result.status !== 0) {
        console.error(`[fix] pnpm check failed with exit code ${result.status ?? 'unknown'}`);
        return false;
    }
    return true;
}

let fixedCount = 0;
for (const dir of fixDirs) fixedCount += normalizeEncodingAndLineEndings(resolve(rootDir, dir));
console.log(`[fix] Normalized UTF-8 (no BOM) and LF in ${fixedCount} file(s).`);

let failed = false;
const tools = [
    ['biome', ['check', '--write', '--config-path=configs/biome.json', 'packages', 'scripts', 'configs']],
    ['oxlint', ['--fix', '-c', 'configs/oxlint.json', 'packages', 'scripts']]
];
for (const [name, args] of tools) {
    if (!runRequiredTool(name, args)) failed = true;
}
if (!runCheck()) failed = true;

if (failed) {
    console.error('[fix] One or more required fix/check commands failed.');
    process.exitCode = 1;
} else {
    console.log('[fix] Fixes and required checks passed.');
}
