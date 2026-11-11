import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';
import { discoverProject } from '../src/host/services/discovery.js';
import { selectRules } from '../src/host/services/ruleSelector.js';
import { type RouterAgent, type RouterHostContext, type RouterState, readRouterState } from '../src/host/services/sessionController.js';
import { RouterStore } from '../src/host/services/store.js';
import { DEFAULT_PROJECT_SETTINGS } from '../src/shared/constants/constants.js';

const demoCursorRoot = fileURLToPath(new URL('../examples/demo-cursor/', import.meta.url));

test('discovers the Cursor demo and routes representative project paths', async () => {
    const snapshot = await discoverProject(demoCursorRoot);

    assert.equal(snapshot.rulesComplete, true);
    assert.equal(snapshot.instructionsRoot, undefined);
    assert.ok(snapshot.rules.some(rule => rule.sourcePath === 'AGENTS.md' && rule.sourceVendor === 'root-file' && rule.alwaysApply));
    assert.ok(snapshot.rules.filter(rule => rule.sourceVendor === 'cursor').length >= 5);
    assert.ok(snapshot.skills.some(skill => skill.name === 'openspec-apply-change'));

    const rulePaths = (targetPath: string) => new Set(selectRules(snapshot, [targetPath]).map(rule => rule.sourcePath));
    assert.ok(rulePaths('src/Test.Core/Example.cs').has('.cursor/rules/csharp-blank-lines.mdc'));
    assert.ok(rulePaths('src/database/query.sql').has('.cursor/rules/embedded-sql-resources.mdc'));
    assert.ok(rulePaths('packages/dsh-core/src/client/components/Example.tsx').has('.cursor/rules/front-definition-of-done.mdc'));
    assert.ok(rulePaths('packages/dsh-agents-router/test/example.test.ts').has('.cursor/rules/front-test-rules.mdc'));
});

test('exposes discovered and selected demo rules through host router state', async () => {
    const dshHome = await mkdtemp(path.join(tmpdir(), 'dsh-router-state-'));
    const projectRoot = demoCursorRoot.replace(/[\\/]+$/, '');
    const sessionId = 'demo-cursor-state-session';
    const activePath = 'src/Test.Core/Example.cs';
    const store = new RouterStore(dshHome);
    try {
        await store.updateSession(sessionId, projectRoot, current => ({ ...current, activePaths: [activePath] }));
        const session = { id: sessionId, header: { cwd: projectRoot }, deriveMessages: () => [] };
        const agent: RouterAgent = {
            id: 'demo-cursor-state-agent',
            status: 'idle',
            session,
            inbox: { nextTurn: [], nextStep: [] },
            runMaintenance: async action => action({ throwIfAborted: () => {} })
        };
        const context: RouterHostContext = {
            logger: { warn: () => {}, error: () => {} },
            agents: { list: () => [agent] },
            workingDirectory: { get: () => undefined },
            skills: { list: async () => [] }
        };
        const state: RouterState = {
            agent,
            sessionId,
            projectRoot,
            settings: DEFAULT_PROJECT_SETTINGS,
            activePaths: [],
            areaText: '',
            snapshot: undefined,
            rules: [],
            text: '',
            source: 'integration-test',
            blockedRoots: new Map(),
            runtimeDiagnostics: new Map(),
            forceEmptyWorkset: false,
            invalidateSkills: () => {}
        };
        const response = await readRouterState(context, store, new Map([[agent.id, state]]), sessionId);

        assert.ok('rules' in response);
        if (!('rules' in response) || !response.settings || !response.diagnostics) return;
        assert.equal(response.projectRoot, projectRoot);
        assert.equal(response.settings.discoveryMode, 'merge');
        assert.ok(response.rules.some(rule => rule.sourcePath === 'AGENTS.md' && rule.selected));
        assert.ok(response.rules.some(rule => rule.sourcePath === '.cursor/rules/csharp-blank-lines.mdc' && rule.selected));
    } finally {
        await rm(dshHome, { recursive: true, force: true });
    }
});
