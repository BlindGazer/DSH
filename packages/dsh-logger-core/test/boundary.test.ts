import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as core from '../src/index.ts';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(path) : [path];
    });
}

describe('logger-core contract boundary', () => {
    it('exposes only the no-op and lightweight optional facade helpers at runtime', () => {
        expect(Object.keys(core).toSorted()).toEqual(['NOOP_LOGGER', 'createClientLogger', 'createHostLogger', 'createOptionalLogger']);
    });

    it('has no package dependencies or plugin registration metadata', () => {
        const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
        for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
            expect(Object.keys(manifest[key] ?? {}), key).toEqual([]);
        }
        expect(manifest.dsh).toBeUndefined();
        expect(manifest.sideEffects).toBe(false);
        expect(manifest.exports['.'].types).toBe('./lib/index.d.ts');
        expect(manifest.exports['.'].default).toBe('./lib/index.js');
    });

    it('keeps the complete production source graph local and free of manager or platform imports', () => {
        const files = sourceFiles(join(packageRoot, 'src'));
        expect(files.length).toBeGreaterThan(0);
        const localFiles = new Set(files);
        for (const file of files) {
            expect(file.endsWith('.ts'), file).toBe(true);
            const source = readFileSync(file, 'utf8');
            // Cover type-only references as well as runtime imports without depending on a compiler API.
            const references = source.matchAll(/\b(?:from\s*|import\s*)(['"])([^'"\r\n]+)\1/gu);
            for (const [, , specifier] of references) {
                expect(specifier?.startsWith('./'), `${file}: ${specifier}`).toBe(true);
                expect(specifier?.endsWith('.ts'), `${file}: ${specifier}`).toBe(true);
                expect(localFiles.has(join(dirname(file), specifier ?? '')), specifier).toBe(true);
            }
            expect(source, file).not.toMatch(/\b(?:import|require)\s*\(/u);
            expect(source, file).not.toMatch(/\bimport\s+[\w$]+\s*=/u);
        }
    });
});
