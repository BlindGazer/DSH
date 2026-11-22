import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

function typescriptFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return typescriptFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

// Includes reexports, side-effect imports and literal dynamic imports; asset suffixes remain intentional.
const importReferences = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;

describe('Core source import conventions', () => {
    it('uses explicit relative TypeScript imports in sources, tests and demo', () => {
        const files = ['src', 'test', 'demo/src'].flatMap(directory => typescriptFiles(join(packageRoot, directory)));
        let checked = 0;
        for (const file of files) {
            for (const match of readFileSync(file, 'utf8').matchAll(importReferences)) {
                const specifier = match[1];
                if (!specifier?.startsWith('.')) continue;
                if (/\.(?:css|scss)(?:[?#]|$)/.test(specifier)) continue;
                expect(specifier, file).toMatch(/\.tsx?$/);
                expect(existsSync(resolve(dirname(file), specifier)), `${file}: ${specifier}`).toBe(true);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(100);
    });
});
