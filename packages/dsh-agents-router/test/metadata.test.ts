import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';

import { MetadataError, parseInstruction } from '../src/host/services/frontmatter.js';
import { parseAreasConfig, validateGlobalSettings, validateProjectSettings } from '../src/shared/index.js';

const cursorRulesDirectory = fileURLToPath(new URL('../examples/demo-cursor/.cursor/rules/', import.meta.url));

test('rules accept optional frontmatter and validate paths and enabled', () => {
    assert.deepEqual(parseInstruction('# Always', 'rule').metadata, {
        path: [],
        enabled: true,
        globs: [],
        alwaysApply: false,
        activationMode: 'manual'
    });
    assert.deepEqual(parseInstruction('---\npath:\n  - src/\n  - "*.ts"\nenabled: false\n---\nDo this', 'rule'), {
        metadata: {
            path: ['src/', '*.ts'],
            enabled: false,
            globs: ['src', 'src/**', '*.ts'],
            alwaysApply: false,
            activationMode: 'glob'
        },
        content: 'Do this'
    });
    assert.throws(() => parseInstruction('---\nunrecognizedField: x\n---\nbody', 'rule'), MetadataError);
    assert.throws(() => parseInstruction('---\nenabled: maybe\n---\nbody', 'rule'), MetadataError);
});

test('rules accept standard paths lists with recursive globs', () => {
    const parsed = parseInstruction(
        '---\npaths:\n  - **/*.js\n  - **/*.ts\n  - **/*.tsx\n  - **/*.jsx\n  - **/*.css\n  - **/*.scss\ndescription: "Scripts: frontend and styles"\n---\nSee [related rule](../other.md).',
        'rule'
    );
    assert.deepEqual(parsed.metadata.path, ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.jsx', '**/*.css', '**/*.scss']);
    assert.match(parsed.content, /\[related rule\]/);
});

test('path and paths aliases merge without duplicating filters', () => {
    assert.deepEqual(parseInstruction('---\npath: "**/*.js"\npaths:\n  - "**/*.js"\n  - "**/*.ts"\n---\nbody', 'rule').metadata.path, [
        '**/*.js',
        '**/*.ts'
    ]);
});

test('parses Cursor glob aliases and derives rule activation modes', () => {
    const parsed = parseInstruction('---\nglobs: src/**/*.{ts,tsx}, !./src/**/*.spec.ts\n---\nBody', 'rule', {
        sourcePath: '.cursor/rules/ui.mdc',
        sourceVendor: 'cursor'
    });
    assert.deepEqual(parsed.metadata.globs, ['src/**/*.{ts,tsx}', '!src/**/*.spec.ts']);
    assert.equal(parsed.metadata.activationMode, 'glob');
    assert.equal(parsed.metadata.sourceVendor, 'cursor');

    const always = parseInstruction('---\nalwaysApply: true\n---\nBody', 'rule');
    assert.equal(always.metadata.alwaysApply, true);
    assert.equal(always.metadata.activationMode, 'always');

    const described = parseInstruction('---\ndescription: Apply during reviews\n---\nBody', 'rule');
    assert.equal(described.metadata.activationMode, 'agent-requested');

    const manual = parseInstruction('---\nalwaysApply: false\n---\nBody', 'rule');
    assert.equal(manual.metadata.activationMode, 'manual');
});

test('treats root instruction files without globs as always active', () => {
    for (const sourcePath of ['AGENTS.md', 'CLAUDE.md', '.cursorrules']) {
        const parsed = parseInstruction('Root instructions', 'rule', { sourcePath });
        assert.equal(parsed.content, 'Root instructions');
        assert.equal(parsed.metadata.alwaysApply, true);
        assert.equal(parsed.metadata.activationMode, 'always');
    }

    const filteredRoot = parseInstruction('---\nglob: *.ts\n---\nBody', 'rule', { sourcePath: 'AGENTS.md' });
    assert.equal(filteredRoot.metadata.alwaysApply, false);
    assert.equal(filteredRoot.metadata.activationMode, 'glob');
});

test('parses all Cursor demo rules', async () => {
    const files = (await readdir(cursorRulesDirectory)).filter(file => file.toLowerCase().endsWith('.mdc')).toSorted();
    const parsed = await Promise.all(
        files.map(async file =>
            parseInstruction(await readFile(path.join(cursorRulesDirectory, file), 'utf8'), 'rule', {
                sourcePath: `.cursor/rules/${file}`,
                sourceVendor: 'cursor'
            })
        )
    );

    assert.equal(files.length, 6);
    assert.equal(parsed.length, files.length);
});

test('skills enforce standard fields and invocation defaults', () => {
    const skill = parseInstruction('---\ndescription: review\n---\nBody', 'skill');
    assert.equal(skill.metadata.description, 'review');
    assert.equal(skill.metadata.enabled, true);
    assert.equal(skill.metadata.modelInvocable, true);
    assert.equal(skill.metadata.userInvocable, true);
    const disabled = parseInstruction(
        '---\ndescription: review\ndisable-model-invocation: true\nuser-invocable: false\n---\nBody',
        'skill'
    );
    assert.equal(disabled.metadata.modelInvocable, false);
    assert.equal(disabled.metadata.userInvocable, false);
    assert.throws(() => parseInstruction('---\nname: bad_name\ndescription: x\n---\nbody', 'skill'), MetadataError);
    assert.throws(() => parseInstruction('---\npath: src/\ndescription: x\n---\nbody', 'skill'), MetadataError);
});

test('skills preserve license, compatibility and allowed-tools metadata', () => {
    const skill = parseInstruction(
        '---\nname: test-skill\ndescription: test license and compatibility\nlicense: MIT\ncompatibility: Requires Node.js 18+\nallowed-tools: ["filesystem/write", "filesystem/read"]\n---\nBody',
        'skill'
    );
    assert.equal(skill.metadata.license, 'MIT');
    assert.equal(skill.metadata.compatibility, 'Requires Node.js 18+');
    assert.deepEqual(skill.metadata['allowed-tools'], ['filesystem/write', 'filesystem/read']);
});

test('path filters allow one safe leading negation only', () => {
    const validAreas = parseAreasConfig(JSON.stringify({ areas: { back: { path: ['src/', '!src/ClientApp/'] } } }));
    assert.equal(validAreas.areas.has('back'), true);
    for (const invalid of ['!', '!   ', '!!src/', '!/absolute/', '!C:\\src/', '!../outside']) {
        assert.equal(parseAreasConfig(JSON.stringify({ areas: { back: { path: invalid } } })).areas.has('back'), false, invalid);
        assert.throws(
            () => parseInstruction(`---\npath: "${invalid.replace(/\\/g, '\\\\')}"\n---\nbody`, 'rule'),
            /non-empty project-relative paths|negation|Invalid escape sequence/,
            invalid
        );
    }
    assert.deepEqual(parseInstruction('---\npaths:\n  - src/\n  - !src/ClientApp/\n---\nbody', 'rule').metadata.path, [
        'src/',
        '!src/ClientApp/'
    ]);
    assert.deepEqual(parseInstruction('---\npath: !src/ClientApp/\n---\nbody', 'rule').metadata.path, ['!src/ClientApp/']);
});

test('area config isolates invalid branches and rejects top-level unrecognized fields', () => {
    const result = parseAreasConfig(
        JSON.stringify({
            areas: {
                front: { path: 'src/front/' },
                'front/admin': { path: ['src/admin/', '*.tsx'], enabled: false },
                broken: { path: '../outside' },
                'broken/child': { path: 'src/child' }
            }
        })
    );
    assert.equal(result.valid, true);
    assert.equal(result.areas.has('front'), true);
    assert.equal(result.areas.has('front/admin'), true);
    assert.equal(result.areas.has('broken'), false);
    assert.equal(result.areas.has('broken/child'), false);
    assert.ok(result.errors.some(message => message.includes('broken')));
    assert.equal(parseAreasConfig('{"extra":true}').areas.size, 0);
    assert.equal(parseAreasConfig('{').valid, false);
});

test('global settings validate locale, theme, polling, and logging values', () => {
    assert.equal(validateGlobalSettings().settings.pollingIntervalMs, 3000);
    assert.equal(validateGlobalSettings({ locale: 'ru', theme: 'light', pollingIntervalMs: 5000, globalLogging: true }).valid, true);
    assert.equal(validateGlobalSettings({ pollingIntervalMs: 2500 }).valid, false);
    assert.equal(validateGlobalSettings({ globalLogging: 'yes' }).valid, false);
});

test('project settings constrain roots and preserve defaults on invalid input', () => {
    assert.equal(validateProjectSettings().settings.tokenBudget, 16_000);
    assert.equal(validateProjectSettings().settings.discoveryMode, 'merge');
    for (const discoveryMode of ['strict', 'fallback', 'merge']) {
        assert.equal(validateProjectSettings({ discoveryMode }).valid, true);
    }
    assert.equal(validateProjectSettings({ discoveryMode: 'unknown' }).valid, false);
    assert.equal(validateProjectSettings({ instructionsRoot: '../outside' }).valid, false);
    assert.equal(validateProjectSettings({ instructionsRoot: 'custom/agent-rules', rulesFolder: 'rules-v2' }).valid, true);
});

test('malformed frontmatter (missing closing delimiter) throws error', () => {
    assert.throws(() => parseInstruction('---\ndescription: unclosed\n', 'rule'), MetadataError);
    assert.throws(() => parseInstruction('---\ndescription: no closing\n', 'skill'), MetadataError);
});

test('frontmatter without opening delimiter returns empty metadata', () => {
    const result = parseInstruction('# Plain Markdown\nBody', 'rule');
    assert.deepEqual(result.metadata, {
        path: [],
        enabled: true,
        globs: [],
        alwaysApply: false,
        activationMode: 'manual'
    });
    assert.equal(result.content, '# Plain Markdown\nBody');
});

test('path and paths accept null, empty string, and empty list', () => {
    // null value treated as empty
    assert.deepEqual(parseInstruction('---\npath: null\ndescription: x\n---\nBody', 'rule').metadata.path, []);
    assert.deepEqual(parseInstruction('---\npaths: null\ndescription: x\n---\nBody', 'rule').metadata.path, []);
    // empty string treated as empty
    assert.deepEqual(parseInstruction('---\npath: ""\ndescription: x\n---\nBody', 'rule').metadata.path, []);
    assert.deepEqual(parseInstruction('---\npaths: ""\ndescription: x\n---\nBody', 'rule').metadata.path, []);
    // empty list
    assert.deepEqual(parseInstruction('---\npath: []\ndescription: x\n---\nBody', 'rule').metadata.path, []);
    assert.deepEqual(parseInstruction('---\npaths: []\ndescription: x\n---\nBody', 'rule').metadata.path, []);
    // mixed: one empty, one constrained
    assert.deepEqual(parseInstruction('---\npath: ""\npaths:\n  - "src/"\n---\nbody', 'rule').metadata.path, ['src/']);
});
