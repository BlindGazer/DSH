import path from 'node:path';
import { assert, test } from 'vitest';
import { normalizeRulePatterns } from '../src/host/services/globNormalizer.js';
import { explainPathMatch, matchesPath, matchesRule, projectRelativePath } from '../src/host/services/pathMatch.js';
import type { NormalizedRuleMetadata } from '../src/shared/models/RouterModels.js';

test('matches exact paths, directories and basic globs case-insensitively', () => {
    assert.equal(matchesPath('src/Client.ts', 'SRC/Client.ts'), true);
    assert.equal(matchesPath('src/Client.ts', 'src/Client'), false);
    assert.equal(matchesPath('src/nested/Client.ts', 'src/'), true);
    assert.equal(matchesPath('src/nested/Client.ts', 'src/*.ts'), false);
    assert.equal(matchesPath('src/nested/Client.ts', 'src/**/*.ts'), true);
    assert.equal(matchesPath('src/nested/Client.ts', '*.TS'), true);
    assert.equal(matchesPath('src/nested/Client.ts', ['*.js', 'src/**/*.ts']), true);
    assert.equal(matchesPath('src/nested/Client.ts', 'src/?ested/*.ts'), true);
    assert.equal(matchesPath('src/nested/Client.ts', 'src/*.ts'), false);
    for (const extension of ['js', 'ts', 'tsx', 'jsx', 'css', 'scss']) {
        assert.equal(matchesPath(`src/nested/file.${extension}`, `**/*.${extension}`), true);
    }
});

test('empty filters are unrestricted and malformed array entries do not match', () => {
    assert.equal(matchesPath('a.ts', undefined), true);
    assert.equal(matchesPath('a.ts', []), true);
    assert.equal(matchesPath('a.ts', ['', '1']), false);
});

test('normalizes Windows separators and rejects paths outside the project', () => {
    assert.equal(matchesPath('src\\a.ts', 'src/'), true);
    const root = path.resolve('project');
    assert.equal(projectRelativePath(root, path.join(root, 'src', 'a.ts')), 'src/a.ts');
    assert.equal(projectRelativePath(root, path.resolve(root, '..', 'outside.txt')), undefined);
});

test('directory patterns without trailing slash include descendants per requirements', () => {
    // Directory patterns with trailing slash include descendants
    assert.equal(matchesPath('src/Client.ts', 'src/'), true);
    assert.equal(matchesPath('src/nested/Client.ts', 'src/'), true);
    // Legacy paths without trailing slash are exact matches (not directories)
    assert.equal(matchesPath('src/Client.ts', 'src'), false);
    assert.equal(matchesPath('src', 'src'), true);
    assert.equal(matchesPath('src/nested', 'src/nested/'), true);
});

test('path filters support ordered exclusions and re-inclusions', () => {
    const front = ['src/ClientApp/', 'src/Components/'];
    const back = ['src/', '!src/ClientApp/', '!src/Components/'];
    for (const file of ['src/ClientApp/index.tsx', 'src/Components/Button.tsx']) {
        assert.equal(matchesPath(file, front), true);
        assert.equal(matchesPath(file, back), false);
    }
    for (const file of ['src/Models/BulkUploadData.cs', 'src/Controllers/AuthController.cs']) {
        assert.equal(matchesPath(file, front), false);
        assert.equal(matchesPath(file, back), true);
    }
    assert.equal(matchesPath('src/ClientApp/shared/types.ts', ['src/', '!src/ClientApp/', 'src/ClientApp/shared/']), true);
    assert.equal(matchesPath('src/ClientApp/index.tsx', ['!src/ClientApp/']), false);
    assert.deepEqual(explainPathMatch('src/ClientApp/index.tsx', back), {
        matched: false,
        reason: 'excluded by !src/ClientApp/'
    });
});

test('matches normalized globs with braces, character classes, and basename matching', () => {
    const extensions = rule(['src/**/*.{ts,tsx}']);
    assert.equal(matchesRule(extensions, '.\\src\\components\\Table.tsx'), true);
    assert.equal(matchesRule(extensions, 'src/components/Table.jsx'), false);
    assert.equal(matchesRule(rule(['src/[ab].ts']), 'src/a.ts'), true);
    assert.equal(matchesRule(rule(['src/[ab].ts']), 'src/c.ts'), false);
    assert.equal(matchesRule(rule(['*.mdc']), '.cursor/rules/general.mdc'), true);
    assert.equal(matchesRule(rule(['*.{ts,tsx}']), 'src/components/Table.tsx'), true);
});

test('matches legacy directory paths after glob normalization', () => {
    const legacyPathRule = rule(normalizeRulePatterns({ path: 'src/components' }));

    assert.equal(matchesRule(legacyPathRule, 'src/components'), true);
    assert.equal(matchesRule(legacyPathRule, 'src/components/Button.tsx'), true);
    assert.equal(matchesRule(legacyPathRule, 'src/pages/Home.tsx'), false);
});

test('combines positive and negative globs and handles all-negative rules', () => {
    const ruleWithExclusion = rule(['src/**/*.{ts,tsx}', '!src/**/*.spec.ts']);
    assert.equal(matchesRule(ruleWithExclusion, 'src/components/Table.tsx'), true);
    assert.equal(matchesRule(ruleWithExclusion, 'src/components/Table.spec.ts'), false);
    const exclusionOnly = rule(['!**/dist/**']);
    assert.equal(matchesRule(exclusionOnly, 'src/index.ts'), true);
    assert.equal(matchesRule(exclusionOnly, 'packages/lib/dist/index.js'), false);
});

test('respects alwaysApply and rejects empty glob metadata', () => {
    assert.equal(matchesRule(rule([], true), ''), true);
    assert.equal(matchesRule(rule([]), 'src/index.ts'), false);
    assert.equal(matchesRule(rule(['**/*']), './src/index.ts'), true);
});

function rule(globs: readonly string[], alwaysApply = false): NormalizedRuleMetadata {
    return {
        globs,
        alwaysApply,
        activationMode: alwaysApply ? 'always' : globs.length ? 'glob' : 'manual'
    };
}
