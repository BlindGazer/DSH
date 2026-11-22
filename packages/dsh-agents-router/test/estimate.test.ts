import { assert, test } from 'vitest';

import { roughTokenEstimate } from '../src/host/services/metrics.ts';

test('estimates tokens heuristically for basic Latin and non-ASCII text', () => {
    assert.equal(roughTokenEstimate('abcd'), 1);
    assert.equal(roughTokenEstimate('中文'), 2);
    assert.equal(roughTokenEstimate(''), 0);
});
