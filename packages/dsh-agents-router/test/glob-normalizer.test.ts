import { assert, test } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { normalizeRulePatterns, sanitizeFrontmatterYaml, splitGlobString } from '../src/host/services/globNormalizer.js';

test('quotes unquoted glob values so YAML accepts wildcard and brace syntax', () => {
    const sanitized = sanitizeFrontmatterYaml('globs: *.ts, *.tsx\nglob: src/**/*.{ts,tsx}\npaths: src/"quoted".ts');

    assert.deepEqual(parseYaml(sanitized), {
        globs: '*.ts, *.tsx',
        glob: 'src/**/*.{ts,tsx}',
        paths: 'src/"quoted".ts'
    });
});

test('preserves empty, quoted, array, and null glob values', () => {
    const source = 'globs:\nglobs: ["*.ts", "*.tsx"]\npaths: \'*.md,*.mdc\'\npath: null';

    assert.equal(sanitizeFrontmatterYaml(source), source);
});

test('splits only commas outside nested braces and brackets', () => {
    assert.deepEqual(splitGlobString('src/**/*.{ts,tsx}, [a,b].ts, !./src/**/*.spec.ts, src\\api\\*.cs'), [
        'src/**/*.{ts,tsx}',
        '[a,b].ts',
        '!src/**/*.spec.ts',
        'src/api/*.cs'
    ]);
});

test('normalizes and deduplicates legacy paths and glob aliases', () => {
    assert.deepEqual(
        normalizeRulePatterns({
            path: './src/core',
            paths: ['src/api/', 'src/index.ts'],
            glob: '*.mdc',
            globs: ['src/**/*.{ts,tsx}, !./src/**/*.spec.ts', 'src/index.ts']
        }),
        ['src/core', 'src/core/**', 'src/api', 'src/api/**', 'src/index.ts', '*.mdc', 'src/**/*.{ts,tsx}', '!src/**/*.spec.ts']
    );
});
