import test from 'node:test'
import assert from 'node:assert/strict'
import { roughTokenEstimate } from '../src/estimate.js'

test('estimates tokens heuristically for basic Latin and non-ASCII text', () => {
  assert.equal(roughTokenEstimate('abcd'), 1)
  assert.equal(roughTokenEstimate('中文'), 2)
  assert.equal(roughTokenEstimate(''), 0)
})
