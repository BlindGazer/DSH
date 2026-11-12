import { assert, expect, test } from 'vitest';
import { createPathTool } from '../src/host/services/pathTool.js';

interface PathToolProperty {
    readonly enum?: readonly string[];
    readonly items?: { readonly type?: string };
    readonly required?: readonly string[];
}

test('path tool updates paths for its owning agent', async () => {
    const projectRoot = process.cwd();
    const owner = { id: 'owner', session: { id: 'session' } };
    const state = {
        agent: owner,
        sessionId: 'session',
        projectRoot,
        activePaths: [],
        rules: [],
        text: '',
        areaText: '',
        settings: { logCategories: {} },
        invalidateSkills() {}
    } as never;
    const store = {
        updateSession: async (_sessionId: string, _projectRoot: string, update: (value: { activePaths: string[] }) => unknown) => ({
            state: update({ activePaths: [] })
        })
    } as never;
    const tool = createPathTool({} as never, store, state, {
        refreshState: async () => state,
        currentDirectory: (_ctx, _state, agent) => {
            assert.equal(agent.id, owner.id);
            return projectRoot;
        }
    });

    const result = await tool.execute({ action: 'add', paths: ['.'] }, { agent: owner as never });
    assert.deepEqual(result.paths, ['.']);
    assert.deepEqual(result.action, 'add');
});

test('path tool rejects execution from a different session', async () => {
    const owner = { id: 'owner', session: { id: 'session' } };
    const tool = createPathTool({} as never, {} as never, { agent: owner, sessionId: 'session' } as never, {} as never);
    await expect(
        tool.execute({ action: 'add', paths: [] }, { agent: { id: 'other', session: { id: 'other-session' } } as never })
    ).rejects.toThrow(/owning DSH session/);
});

test('path tool input is registry-ready JSON Schema, not the defineTool DSL', () => {
    const tool = createPathTool({} as never, {} as never, {} as never, {} as never);
    assert.equal(tool.parameters.type, 'object');
    assert.deepEqual(tool.parameters.required, ['action', 'paths']);
    const properties = tool.parameters.properties as Record<string, PathToolProperty>;
    assert.deepEqual(properties.action?.enum, ['add', 'release']);
    assert.deepEqual(properties.paths?.items, { type: 'string' });
    for (const property of Object.values(properties)) assert.equal('required' in property, false);
});

test('path tool output uses standard JSON Schema required fields', () => {
    const tool = createPathTool({} as never, {} as never, { agent: { id: 'test' } } as never, {} as never);
    const schema = tool.output.schema as {
        required?: string[];
        properties?: Record<string, Record<string, unknown>>;
    };

    assert.deepEqual(schema.required, ['action', 'message', 'paths']);
    assert.deepEqual(Object.keys(schema.properties ?? {}).toSorted(), ['action', 'message', 'paths']);
    for (const property of Object.values(schema.properties ?? {})) assert.equal('required' in property, false);
});
