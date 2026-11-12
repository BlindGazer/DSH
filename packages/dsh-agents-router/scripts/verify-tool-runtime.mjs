// Run with Electron's ELECTRON_RUN_AS_NODE=1 and pass the installed dsh directory
// and a bundled pathTool module URL. Uses real DSH schemas/registration, no profile writes.
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = pathToFileURL(path.resolve(process.argv[2]) + path.sep);
const { defineTool, ToolsService, assertObjectJsonSchema, assertSupportedJsonSchema } = await import(
    new URL('node_modules/@deepseek-ai/dsh-tools/lib/index.js', runtime)
);
const { createPathTool } = await import(pathToFileURL(path.resolve(process.argv[3])));
const owner = { id: 'owner' };
const state = {
    agent: owner,
    sessionId: 'owner',
    projectRoot: process.cwd(),
    activePaths: [],
    rules: [],
    settings: { logCategories: {} },
    invalidateSkills() {}
};
const tool = createPathTool(
    {},
    {
        async updateSession(_id, _root, update) {
            return { state: update({ activePaths: state.activePaths }) };
        }
    },
    state,
    { refreshState: async () => state, currentDirectory: () => process.cwd() }
);

// Reproduce the previous failure using the actual installed DSL compiler.
assert.throws(
    () =>
        defineTool({
            ...tool,
            parameters: { action: { type: 'string', required: true }, paths: { type: 'array', items: { type: 'string' }, required: true } }
        }),
    /required|supported/
);
assertObjectJsonSchema(tool.parameters);
assertSupportedJsonSchema(tool.output.schema);
let registered;
const registry = {
    ctx: {},
    layers: {
        effect(_ctx, apply) {
            apply({
                tools: {
                    insert(name, value) {
                        registered = { name, ...value };
                    }
                }
            });
            return () => {};
        }
    }
};
ToolsService.prototype.register.call(registry, tool);
assert.equal(registered.name, 'agents_router_paths');
assert.equal(registered.definition, tool);
assert.deepEqual((await tool.execute({ action: 'add', paths: ['.'] }, { agent: owner })).paths, ['.']);
assert.deepEqual(state.activePaths, ['.']);
await tool.execute({ action: 'release', paths: ['.'] }, { agent: owner });
assert.deepEqual(state.activePaths, []);
await assert.rejects(tool.execute({ action: 'add', paths: [] }, {}), /owning DSH session/);
await assert.rejects(tool.execute({ action: 'add', paths: [] }, { agent: { id: 'child' } }), /owning DSH session/);
await assert.rejects(tool.execute({ action: 'invalid', paths: [] }, { agent: owner }), /requires action/);
console.log('PASS: original DSL failure reproduced; raw schemas registered by real DSH; add/release and owner isolation verified.');
