import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getReleaseViolation, isReleaseText } from './release-content-policy.ts';

interface PackResult {
    readonly files: readonly { readonly path: string }[];
}

const packagesDir = resolve(import.meta.dirname, '../packages');
const violations: string[] = [];

function inspect(packageName: string, packageDir: string, path: string, source: string): void {
    const content = isReleaseText(path) ? readFileSync(resolve(packageDir, path), 'utf8') : '';
    const violation = getReleaseViolation(packageName, path, content);
    if (violation) violations.push(`${packageName} (${source}): ${path}: ${violation}`);
}

for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('dsh-')) continue;
    const packageDir = resolve(packagesDir, entry.name);
    const outputDir = resolve(packageDir, 'lib');
    for (const output of readdirSync(outputDir, { recursive: true, withFileTypes: true })) {
        if (output.isDirectory()) continue;
        const path = join(output.parentPath.slice(packageDir.length + 1), output.name).replaceAll('\\', '/');
        inspect(entry.name, packageDir, path, 'build');
    }
    const pack = spawnSync('npm pack --dry-run --json --ignore-scripts', {
        cwd: packageDir,
        encoding: 'utf8',
        shell: true
    });
    if (pack.error) throw pack.error;
    if (pack.status !== 0) throw new Error(`Cannot list the npm archive for ${entry.name}: ${pack.stderr}`);
    const archives: PackResult[] = JSON.parse(pack.stdout);
    const archive = archives[0];
    if (!archive?.files.some(file => /^(?:lib\/).+\.[cm]?js$/.test(file.path))) {
        violations.push(`${entry.name} (npm archive): no runtime JavaScript`);
    }
    for (const { path } of archive?.files ?? []) inspect(entry.name, packageDir, path, 'npm archive');
}

if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exitCode = 1;
} else {
    console.log('Build output and npm archive contents passed the release policy.');
}
