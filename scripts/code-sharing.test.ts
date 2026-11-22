import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packages = readdirSync(join(root, 'packages'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
const manifests = packages.map(name => JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8')));
const internalNames = new Set(manifests.map(manifest => manifest.name));

function sources(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? sources(path) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
    });
}

const imports = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;

describe('internal source sharing boundaries', () => {
    it('never installs an internal package as a dependency', () => {
        for (const manifest of manifests) {
            for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
                for (const name of Object.keys(manifest[field] ?? {})) {
                    expect(internalNames.has(name), `${manifest.name} ${field}: ${name}`).toBe(false);
                }
            }
        }
    });
    it('keeps logger-core independent even for type imports', () => {
        const manifest = manifests.find(value => value.name === '@kalex/dsh-logger-core');
        for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
            expect(Object.keys(manifest[field] ?? {})).toEqual([]);
        }
        for (const file of sources(join(root, 'packages/dsh-logger-core/src'))) {
            for (const match of readFileSync(file, 'utf8').matchAll(imports)) {
                expect(match[1].startsWith('./'), `${file}: ${match[1]}`).toBe(true);
            }
        }
    });
    it('does not import the manager implementation from consumers', () => {
        for (const name of packages.filter(packageName => packageName !== 'dsh-logger')) {
            for (const file of sources(join(root, 'packages', name, 'src'))) {
                for (const match of readFileSync(file, 'utf8').matchAll(imports)) {
                    expect(match[1], file).not.toMatch(/(?:^@kalex\/|\/)dsh-logger(?:\/|$)/);
                    expect(match[1], file).not.toMatch(/(?:^@kalex\/dsh-|(?:^|\/)packages\/).*\/lib(?:\/|$)/);
                }
            }
        }
    });
    it('does not expose logger-core through the Core barrel', () => {
        expect(readFileSync(join(root, 'packages/dsh-core/src/index.ts'), 'utf8')).not.toContain('dsh-logger');
    });
});
