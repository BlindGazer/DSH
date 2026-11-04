import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { explainPathMatch, matchesPath, projectRelativePath } from '../src/path-match.js'

test('matches exact paths, directories and basic globs case-insensitively', () => {
  assert.equal(matchesPath('src/Client.ts', 'SRC/Client.ts'), true)
  assert.equal(matchesPath('src/Client.ts', 'src/Client'), false)
  assert.equal(matchesPath('src/nested/Client.ts', 'src/'), true)
  assert.equal(matchesPath('src/nested/Client.ts', 'src/*.ts'), false)
  assert.equal(matchesPath('src/nested/Client.ts', 'src/**/*.ts'), true)
  assert.equal(matchesPath('src/nested/Client.ts', '*.TS'), true)
  assert.equal(matchesPath('src/nested/Client.ts', ['*.js', 'src/**/*.ts']), true)
  assert.equal(matchesPath('src/nested/Client.ts', 'src/?ested/*.ts'), true)
  assert.equal(matchesPath('src/nested/Client.ts', 'src/*.ts'), false)
  for (const extension of ['js', 'ts', 'tsx', 'jsx', 'css', 'scss']) {
    assert.equal(matchesPath(`src/nested/file.${extension}`, `**/*.${extension}`), true)
  }
})

test('empty filters are unrestricted and malformed array entries do not match', () => {
  assert.equal(matchesPath('a.ts', undefined), true)
  assert.equal(matchesPath('a.ts', []), true)
  assert.equal(matchesPath('a.ts', ['', 1]), false)
})

test('normalizes Windows separators and rejects paths outside the project', () => {
  assert.equal(matchesPath('src\\a.ts', 'src/'), true)
  const root = path.resolve('project')
  assert.equal(projectRelativePath(root, path.join(root, 'src', 'a.ts')), 'src/a.ts')
  assert.equal(projectRelativePath(root, path.resolve(root, '..', 'outside.txt')), undefined)
})

test('directory patterns without trailing slash include descendants per requirements', () => {
  // Directory patterns with trailing slash include descendants
  assert.equal(matchesPath('src/Client.ts', 'src/'), true)
  assert.equal(matchesPath('src/nested/Client.ts', 'src/'), true)
  // Legacy paths without trailing slash are exact matches (not directories)
  assert.equal(matchesPath('src/Client.ts', 'src'), false)
  assert.equal(matchesPath('src', 'src'), true)
  assert.equal(matchesPath('src/nested', 'src/nested/'), true)
})

test('path filters support ordered exclusions and re-inclusions', () => {
  const front = ['src/ClientApp/', 'src/Components/']
  const back = ['src/', '!src/ClientApp/', '!src/Components/']
  for (const file of ['src/ClientApp/index.tsx', 'src/Components/Button.tsx']) {
    assert.equal(matchesPath(file, front), true)
    assert.equal(matchesPath(file, back), false)
  }
  for (const file of ['src/Models/BulkUploadData.cs', 'src/Controllers/AuthController.cs']) {
    assert.equal(matchesPath(file, front), false)
    assert.equal(matchesPath(file, back), true)
  }
  assert.equal(matchesPath('src/ClientApp/shared/types.ts', ['src/', '!src/ClientApp/', 'src/ClientApp/shared/']), true)
  assert.equal(matchesPath('src/ClientApp/index.tsx', ['!src/ClientApp/']), false)
  assert.deepEqual(explainPathMatch('src/ClientApp/index.tsx', back), {
    matched: false, reason: 'excluded by !src/ClientApp/',
  })
})
