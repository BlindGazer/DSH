import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';
import { discoverProject } from '../src/host/services/discovery.js';
import { selectRules } from '../src/host/services/ruleSelector.js';
import { DEFAULT_PROJECT_SETTINGS } from '../src/shared/index.js';
import type { DiscoveredRule, ProjectDiscoverySnapshot } from '../src/shared/models/RouterModels.js';

const selectRulesForPaths = selectRules as (snapshot: ProjectDiscoverySnapshot, activePaths?: string[]) => DiscoveredRule[];

const demoRoot = fileURLToPath(new URL('../examples/demo-project/', import.meta.url));

test('demo routes inherited, filtered, private and enabled-area rules', async () => {
    const snapshot = await discoverProject(demoRoot, DEFAULT_PROJECT_SETTINGS);
    assert.equal(snapshot.rulesComplete, true);
    assert.deepEqual(
        snapshot.skills.map(skill => skill.name),
        ['backend-patterns', 'front-review', 'frontend-style', 'review']
    );

    const frontend = new Set(selectRulesForPaths(snapshot, ['src/front/components/AccessibleButton.tsx']).map(rule => rule.sourcePath));
    assert.ok(frontend.has('agents/agents.md'));
    assert.ok(frontend.has('agents/rules/typescript.md'));
    assert.ok(frontend.has('agents/front/agents.md'));
    assert.ok(frontend.has('agents/front/rules/components.md'));

    const admin = selectRulesForPaths(snapshot, ['src/front/admin/permissions.ts']).map(rule => rule.sourcePath);
    assert.ok(admin.includes('agents/front/admin/agents.md'));
    const privateFile = selectRulesForPaths(snapshot, ['src/private/config.ts']).map(rule => rule.sourcePath);
    assert.ok(privateFile.includes('agents/rules/private.md'));
    const backend = selectRulesForPaths(snapshot, ['src/api/health.ts']).map(rule => rule.area);
    assert.ok(backend.includes('back'));
});
