import { assert, test } from 'vitest';
import { createPathTool } from '../src/host/services/pathTool.js';

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
