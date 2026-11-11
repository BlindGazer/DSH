import { assert, test } from 'vitest';

import { cleanNameList, parseNameList } from '../src/client/utils/name-list.js';

test('keeps blank rows while typing and removes them when preparing to save', () => {
    const typed = parseNameList('AGENTS.md\n\nCLAUDE.md\r\n ');
    assert.deepEqual(typed, ['AGENTS.md', '', 'CLAUDE.md', ' ']);
    assert.deepEqual(cleanNameList(typed), ['AGENTS.md', 'CLAUDE.md']);
});
