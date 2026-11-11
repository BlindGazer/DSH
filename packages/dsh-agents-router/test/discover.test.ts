import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';
import { discoverProject, loadSkillDefinition } from '../src/host/services/discovery.js';
import { diagnosePath, selectRules } from '../src/host/services/ruleSelector.js';
import { DEFAULT_PROJECT_SETTINGS } from '../src/shared/index.js';
import type { DiscoveredRule, ProjectDiscoverySnapshot, ProjectSettings } from '../src/shared/models/RouterModels.js';

interface PathDiagnosis {
    rule: DiscoveredRule;
    applies: boolean;
    reason: string;
}

const selectRulesForPaths = selectRules as (snapshot: ProjectDiscoverySnapshot, activePaths?: string[]) => DiscoveredRule[];
const diagnoseProjectPath = diagnosePath as (snapshot: ProjectDiscoverySnapshot, filePath: string) => PathDiagnosis[];

const demo = fileURLToPath(new URL('../examples/demo-project', import.meta.url));

test('discovers global, nested area and native skill metadata', async () => {
    const snapshot = await discoverProject(demo);
    assert.equal(snapshot.areasConfigValid, true);
    assert.equal(snapshot.rules.length, 16);
    const frontArea = snapshot.areas.get('front');
    const adminArea = snapshot.areas.get('front/admin');
    assert.ok(frontArea);
    assert.ok(adminArea);
    assert.equal(frontArea.available, true);
    assert.equal(adminArea.available, true);
    assert.deepEqual(
        snapshot.skills.map(({ name }) => name),
        ['backend-patterns', 'front-review', 'frontend-style', 'review']
    );
    const reviewSkill = snapshot.skills.find(({ name }) => name === 'review');
    assert.ok(reviewSkill);
    assert.ok(reviewSkill.invocation);
    assert.equal(reviewSkill.invocation.userInvocable, true);
});

test('requires an existing valid area config before instruction redirection is enabled', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-area-config-${randomUUID()}-`));
    const config = path.join(project, 'agents', 'dsh', 'agents-router.json');
    try {
        await mkdir(path.dirname(config), { recursive: true });
        assert.equal((await discoverProject(project)).areasConfigValid, false);

        await writeFile(config, '{invalid', 'utf8');
        assert.equal((await discoverProject(project)).areasConfigValid, false);

        await writeFile(config, JSON.stringify({ areas: { invalid: { path: [] } } }), 'utf8');
        assert.equal((await discoverProject(project)).areasConfigValid, false);

        await writeFile(config, JSON.stringify({ areas: {} }), 'utf8');
        assert.equal((await discoverProject(project)).areasConfigValid, true);
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('loads only the rules matching each file and the full area-parent chain', async () => {
    const snapshot = await discoverProject(demo);
    assert.deepEqual(
        selectRulesForPaths(snapshot).map(({ sourcePath }) => sourcePath),
        ['agents/agents.md', 'agents/rules/human-communication.md', 'agents/rules/no-fancy-symbols.md', 'agents/rules/ponytail.md']
    );
    const frontRules = selectRulesForPaths(snapshot, ['src/front/App.tsx', 'src/front/App.tsx']);
    const front = frontRules.map(({ sourcePath }) => sourcePath);
    assert.equal(new Set(front).size, front.length);
    assert.deepEqual(front, [
        'agents/agents.md',
        'agents/rules/human-communication.md',
        'agents/rules/no-fancy-symbols.md',
        'agents/rules/ponytail.md',
        'agents/rules/typescript.md',
        'agents/front/agents.md',
        'agents/front/rules/components.md',
        'agents/front/rules/front-rules.md'
    ]);
    const admin = selectRulesForPaths(snapshot, ['src/front/admin/Users.tsx']).map(({ sourcePath }) => sourcePath);
    assert.deepEqual(admin, [
        'agents/agents.md',
        'agents/rules/human-communication.md',
        'agents/rules/no-fancy-symbols.md',
        'agents/rules/ponytail.md',
        'agents/rules/typescript.md',
        'agents/front/agents.md',
        'agents/front/rules/components.md',
        'agents/front/rules/front-rules.md',
        'agents/front/admin/agents.md'
    ]);
    assert.equal(
        selectRulesForPaths(snapshot, ['src/api/Client.ts']).some(({ content }) => content?.includes('must never be selected')),
        false
    );
    const privateDiagnosis = diagnoseProjectPath(snapshot, 'src/private/credentials.ts').find(({ rule }) =>
        rule.sourcePath.endsWith('private.md')
    );
    assert.ok(privateDiagnosis);
    assert.equal(privateDiagnosis.applies, true);
});

test('routes paths through positive and negative area filters with precise diagnostics', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-negation-${randomUUID()}-`));
    try {
        const agents = path.join(project, 'agents');
        await mkdir(path.join(agents, 'dsh'), { recursive: true });
        await mkdir(path.join(agents, 'front', 'rules'), { recursive: true });
        await mkdir(path.join(agents, 'back'), { recursive: true });
        await writeFile(
            path.join(agents, 'dsh', 'agents-router.json'),
            JSON.stringify({
                areas: {
                    front: { path: ['src/ClientApp/', 'src/Components/'] },
                    back: { path: ['src/', '!src/ClientApp/', '!src/Components/'] }
                }
            }),
            'utf8'
        );
        await writeFile(path.join(agents, 'front', 'agents.md'), 'Frontend rules', 'utf8');
        await writeFile(
            path.join(agents, 'front', 'rules', 'exclude.md'),
            `---
path:
  - src/
  - !src/ClientApp/
---
Exclude client application files`,
            'utf8'
        );
        await writeFile(path.join(agents, 'back', 'agents.md'), 'Backend rules', 'utf8');
        const snapshot = await discoverProject(project);
        for (const [file, excludedBy] of [
            ['src/ClientApp/index.tsx', '!src/ClientApp/'],
            ['src/Components/Button.tsx', '!src/Components/']
        ] as const) {
            const selected = new Set(selectRulesForPaths(snapshot, [file]).map(({ area }) => area));
            assert.ok(selected.has('front'), file);
            assert.equal(selected.has('back'), false, file);
            const diagnoses = diagnoseProjectPath(snapshot, file);
            const backDiagnosis = diagnoses.find(({ rule }) => rule.area === 'back');
            assert.ok(backDiagnosis);
            assert.equal(backDiagnosis.reason, `excluded by area pattern ${excludedBy}`);
            if (file.includes('ClientApp')) {
                const ruleDiagnosis = diagnoses.find(({ rule }) => rule.sourcePath.endsWith('exclude.md'));
                assert.ok(ruleDiagnosis);
                assert.equal(ruleDiagnosis.reason, 'excluded by rule pattern !src/ClientApp/');
            }
        }
        for (const file of ['src/Models/BulkUploadData.cs', 'src/Controllers/AuthController.cs']) {
            const selected = new Set(selectRulesForPaths(snapshot, [file]).map(({ area }) => area));
            assert.ok(selected.has('back'), file);
            assert.equal(selected.has('front'), false, file);
        }

        await writeFile(
            path.join(agents, 'front', 'agents.md'),
            `---
path:
  - src/
  - !src/ClientApp/
  - src/ClientApp/shared/
---
Frontend shared rules`,
            'utf8'
        );
        const revised = await discoverProject(project);
        assert.ok(selectRulesForPaths(revised, ['src/ClientApp/shared/types.ts']).some(({ area }) => area === 'front'));
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('skips one malformed rule while keeping the remaining project rules available', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-discovery-${randomUUID()}-`));
    try {
        const rules = path.join(project, 'agents', 'rules');
        await mkdir(rules, { recursive: true });
        await writeFile(path.join(rules, 'valid.md'), 'Valid instruction', 'utf8');
        await writeFile(path.join(rules, 'invalid.md'), '---\ndescription: text: not quoted\n---\nInvalid instruction', 'utf8');
        const snapshot = await discoverProject(project);
        assert.deepEqual(
            snapshot.rules.map(({ sourcePath }) => sourcePath),
            ['agents/rules/valid.md']
        );
        assert.equal(snapshot.rulesComplete, true);
        assert.ok(snapshot.diagnostics.some(({ code, target }) => code === 'rule-file' && target === 'agents/rules/invalid.md'));
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('loads the full skill body only on native provider request', async () => {
    const snapshot = await discoverProject(demo);
    const skill = snapshot.skills.find(({ name }) => name === 'review');
    assert.ok(skill);
    assert.equal(Object.hasOwn(skill, 'content'), false);
    const settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS;
    const definition = await loadSkillDefinition(demo, settings, { name: skill.name, sourcePath: skill.sourcePath });
    assert.ok(definition);
    assert.ok(definition.content);
    assert.match(definition.content, /Review the supplied diff/);
});

test('scans Markdown and MDC rule extensions case-insensitively', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-extensions-${randomUUID()}-`));
    try {
        const rules = path.join(project, 'agents', 'rules');
        await mkdir(rules, { recursive: true });
        const files = ['lower.md', 'upper.MD', 'cursor.mdc', 'cursor-uppercase.MDC', 'ignore.txt', 'backup.md.old'];
        await Promise.all(files.map(file => writeFile(path.join(rules, file), `Rule ${file}`, 'utf8')));

        const snapshot = await discoverProject(project);

        assert.deepEqual(snapshot.rules.map(({ sourcePath }) => sourcePath).toSorted(), [
            'agents/rules/cursor-uppercase.MDC',
            'agents/rules/cursor.mdc',
            'agents/rules/lower.md',
            'agents/rules/upper.MD'
        ]);
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('falls back to root, Cursor, Claude, and Codex instructions and skills', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-workspace-discovery-${randomUUID()}-`));
    try {
        const fixtures = [
            ['AGENTS.md', 'Root agents'],
            ['AGENT.md', 'Root agent'],
            ['CLAUDE.md', 'Root Claude'],
            ['.cursorrules', 'Cursor root'],
            ['.cursor/rules/nested/cursor.mdc', 'Cursor rule'],
            ['.cursor/skills/cursor-skill/SKILL.md', '---\ndescription: Cursor skill\n---\nCursor body'],
            ['.claude/CLAUDE.md', 'Claude root'],
            ['.claude/rules/nested/claude.mdc', 'Claude rule'],
            ['.claude/skills/claude-skill/SKILL.md', '---\ndescription: Claude skill\n---\nClaude body'],
            ['.claude/commands/custom-command.md', '---\ndescription: Claude command\n---\nCommand body'],
            ['.codex/rules/codex.md', 'Codex rule'],
            ['.codex/root.mdc', 'Codex root rule'],
            ['.codex/skills/codex-skill/SKILL.md', '---\ndescription: Codex skill\n---\nCodex body']
        ] as const;
        for (const [relativePath, content] of fixtures) {
            const filePath = path.join(project, relativePath);
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, content, 'utf8');
        }

        const snapshot = await discoverProject(project);
        const ruleByPath = new Map(snapshot.rules.map(rule => [rule.sourcePath, rule]));
        for (const sourcePath of ['AGENTS.md', 'AGENT.md', 'CLAUDE.md', '.cursorrules']) {
            const rule = ruleByPath.get(sourcePath);
            assert.ok(rule, sourcePath);
            assert.equal(rule.alwaysApply, true, sourcePath);
            assert.equal(rule.sourceVendor, 'root-file', sourcePath);
        }
        assert.equal(ruleByPath.get('.claude/CLAUDE.md')?.alwaysApply, true);
        assert.equal(ruleByPath.get('.claude/CLAUDE.md')?.sourceVendor, 'claude');
        assert.equal(ruleByPath.get('.cursor/rules/nested/cursor.mdc')?.sourceVendor, 'cursor');
        assert.equal(ruleByPath.get('.codex/rules/codex.md')?.alwaysApply, true);
        assert.equal(ruleByPath.get('.codex/root.mdc')?.alwaysApply, true);
        assert.deepEqual(snapshot.skills.map(({ name }) => name).toSorted(), [
            'claude-skill',
            'codex-skill',
            'cursor-skill',
            'custom-command'
        ]);
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('default merge discovers .agents, root AGENTS.md and Cursor rules together', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-default-merge-${randomUUID()}-`));
    try {
        const fixtures = [
            ['.agents/agents.md', 'Legacy project instructions'],
            ['.agents/rules/legacy.md', 'Legacy rule'],
            ['AGENTS.md', 'Root instructions'],
            ['.cursor/rules/cursor.mdc', '---\nglobs: *.ts\n---\nCursor rule']
        ] as const;
        for (const [relativePath, content] of fixtures) {
            const filePath = path.join(project, relativePath);
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, content, 'utf8');
        }

        const snapshot = await discoverProject(project);
        const rules = new Map(snapshot.rules.map(rule => [rule.sourcePath, rule]));
        assert.equal(snapshot.instructionsRoot, path.join(project, '.agents'));
        assert.ok(rules.has('.agents/agents.md'));
        assert.ok(rules.has('.agents/rules/legacy.md'));
        assert.equal(rules.get('AGENTS.md')?.alwaysApply, true);
        assert.equal(rules.get('.cursor/rules/cursor.mdc')?.sourceVendor, 'cursor');
        assert.ok(selectRulesForPaths(snapshot, ['src/app.ts']).some(rule => rule.sourcePath === '.cursor/rules/cursor.mdc'));
        assert.equal(snapshot.rulesComplete, true);

        const fallback = await discoverProject(project, { ...DEFAULT_PROJECT_SETTINGS, discoveryMode: 'fallback' });
        assert.ok(fallback.rules.some(rule => rule.sourcePath === '.agents/rules/legacy.md'));
        assert.ok(fallback.rules.some(rule => rule.sourcePath === '.cursor/rules/cursor.mdc'));
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('uses configured discovery mode to choose fallback versus merged sources', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-discovery-mode-${randomUUID()}-`));
    try {
        const internalRule = path.join(project, 'agents', 'rules', 'internal.md');
        const cursorRule = path.join(project, '.cursor', 'rules', 'cursor.mdc');
        const cursorSkill = path.join(project, '.cursor', 'skills', 'duplicate-skill', 'SKILL.md');
        await mkdir(path.dirname(internalRule), { recursive: true });
        await mkdir(path.dirname(cursorRule), { recursive: true });
        await mkdir(path.dirname(cursorSkill), { recursive: true });
        await writeFile(internalRule, 'Internal rule', 'utf8');
        await writeFile(cursorRule, 'Cursor rule', 'utf8');
        await writeFile(cursorSkill, '---\ndescription: Duplicate skill\n---\nBody', 'utf8');

        const fallback = await discoverProject(project, { ...DEFAULT_PROJECT_SETTINGS, discoveryMode: 'fallback' });
        assert.deepEqual(
            fallback.rules.map(({ sourcePath }) => sourcePath),
            ['agents/rules/internal.md']
        );
        const strict = await discoverProject(project, { ...DEFAULT_PROJECT_SETTINGS, discoveryMode: 'strict' });
        assert.deepEqual(
            strict.rules.map(({ sourcePath }) => sourcePath),
            ['agents/rules/internal.md']
        );
        const merged = await discoverProject(project, { ...DEFAULT_PROJECT_SETTINGS, discoveryMode: 'merge' });
        assert.deepEqual(merged.rules.map(({ sourcePath }) => sourcePath).toSorted(), [
            '.cursor/rules/cursor.mdc',
            'agents/rules/internal.md'
        ]);
        const deduplicated = await discoverProject(project, {
            ...DEFAULT_PROJECT_SETTINGS,
            instructionsRoot: '.cursor',
            discoveryMode: 'merge'
        });
        assert.equal(deduplicated.rules.length, 1);
        assert.equal(deduplicated.skills.length, 1);

        const strictProject = await mkdtemp(path.join(tmpdir(), `dsh-router-strict-discovery-${randomUUID()}-`));
        try {
            const strictRule = path.join(strictProject, '.cursor', 'rules', 'cursor.md');
            await mkdir(path.dirname(strictRule), { recursive: true });
            await writeFile(strictRule, 'Fallback rule', 'utf8');
            const strictWithoutConfiguredRoot = await discoverProject(strictProject, {
                ...DEFAULT_PROJECT_SETTINGS,
                discoveryMode: 'strict'
            });
            assert.deepEqual(strictWithoutConfiguredRoot.rules, []);
        } finally {
            await rm(strictProject, { recursive: true, force: true });
        }
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});

test('preserves skill metadata license, compatibility and allowed-tools', async () => {
    const project = await mkdtemp(path.join(tmpdir(), `dsh-router-metadata-${randomUUID()}-`));
    try {
        const skills = path.join(project, 'agents', 'skills', 'test-skill');
        await mkdir(skills, { recursive: true });
        await writeFile(
            path.join(skills, 'SKILL.md'),
            `---
name: test-skill
description: Test skill with metadata
license: MIT
compatibility: Requires Node.js 18+
allowed-tools: ["filesystem/write", "filesystem/read"]
---\nBody`,
            'utf8'
        );
        const snapshot = await discoverProject(project);
        const skill = snapshot.skills.find(({ name }) => name === 'test-skill');
        assert.ok(skill);
        assert.equal(skill.license, 'MIT');
        assert.equal(skill.compatibility, 'Requires Node.js 18+');
        assert.deepEqual(skill['allowed-tools'], ['filesystem/write', 'filesystem/read']);
    } finally {
        await rm(project, { recursive: true, force: true });
    }
});
