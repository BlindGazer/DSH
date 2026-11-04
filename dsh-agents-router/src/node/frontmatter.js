import { open } from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'
import { validProjectFilter } from '../shared/validation.js'

const RULE_FIELDS = new Set(['path', 'paths', 'description', 'enabled'])
// Skill fields include Agent Skills standard (name, description, license, compatibility, metadata, allowed-tools)
// plus DSH extensions (disable-model-invocation, user-invocable, enabled, whenToUse).
const SKILL_FIELDS = new Set([
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools',
  'disable-model-invocation', 'user-invocable', 'enabled', 'whenToUse',
])
const MAX_FRONTMATTER_BYTES = 64 * 1024

export class MetadataError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MetadataError'
  }
}

/** Parse an optional YAML frontmatter block and validate supported metadata. */
export function parseInstruction(text, kind) {
  // Check if text starts with YAML frontmatter delimiter
  const frontmatterStart = /^(?:\uFEFF)?---[ \t]*\r?\n/.exec(text)
  if (frontmatterStart) {
    // Opening --- found, now look for closing ---
    const remaining = text.slice(frontmatterStart[0].length)
    const endMatch = /^([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(remaining)
    if (!endMatch) {
      // Opening --- found but closing --- missing: malformed frontmatter
      throw new MetadataError('YAML frontmatter opening delimiter without closing delimiter')
    }
    const metadata = parseObject(endMatch[1])
    const allowed = kind === 'skill' ? SKILL_FIELDS : RULE_FIELDS
    for (const key of Object.keys(metadata)) {
      if (!allowed.has(key)) throw new MetadataError(`unknown ${kind} frontmatter field "${key}"`)
    }

    const filters = [...(metadata.path === undefined || metadata.path === '' || metadata.path === null ? [] : Array.isArray(metadata.path) ? metadata.path : [metadata.path]),
      ...(metadata.paths === undefined || metadata.paths === '' || metadata.paths === null ? [] : Array.isArray(metadata.paths) ? metadata.paths : [metadata.paths])]
    if (!filters.every(validProjectFilter)) {
      throw new MetadataError('frontmatter fields "path" and "paths" must contain non-empty project-relative paths')
    }
    metadata.path = [...new Set(filters)]
    delete metadata.paths
    metadata.enabled = booleanField(metadata.enabled, 'enabled', true)

    if (metadata.description !== undefined && typeof metadata.description !== 'string') {
      throw new MetadataError('frontmatter field "description" must be a string')
    }
    if (kind === 'skill') {
      if (typeof metadata.description !== 'string' || metadata.description.trim() === '') {
        throw new MetadataError('skill frontmatter requires a non-empty "description"')
      }
      if (metadata.name !== undefined && (typeof metadata.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name))) {
        throw new MetadataError('skill frontmatter field "name" must be a lowercase kebab-case name')
      }
      if (metadata.whenToUse !== undefined && typeof metadata.whenToUse !== 'string') {
        throw new MetadataError('skill frontmatter field "whenToUse" must be a string')
      }
      if (metadata.metadata !== undefined && !isRecord(metadata.metadata)) {
        throw new MetadataError('skill frontmatter field "metadata" must be an object')
      }
      metadata.modelInvocable = !booleanField(metadata['disable-model-invocation'], 'disable-model-invocation', false)
      metadata.userInvocable = booleanField(metadata['user-invocable'], 'user-invocable', true)
    }

    const source = text.slice(frontmatterStart[0].length + endMatch[0].length)
    return { metadata, content: source }
  }
  // No frontmatter delimiter found: return default metadata (enabled rule with no paths)
  return { metadata: { path: [], enabled: true }, content: text }
}

/** Read and parse only SKILL.md frontmatter; the body is deferred until invocation. */
export async function readSkillMetadata(filePath) {
  const handle = await open(filePath, 'r')
  try {
    const chunk = Buffer.alloc(4096)
    let bytes = Buffer.alloc(0)
    let position = 0
    while (bytes.length <= MAX_FRONTMATTER_BYTES) {
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, position)
      if (bytesRead === 0) break
      bytes = Buffer.concat([bytes, chunk.subarray(0, bytesRead)])
      position += bytesRead
      const text = bytes.toString('utf8')
      const match = /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
      if (match) return parseInstruction(match[0], 'skill').metadata
    }
    if (bytes.length > MAX_FRONTMATTER_BYTES) throw new MetadataError('skill frontmatter exceeds 64 KiB')
    return parseInstruction(bytes.toString('utf8'), 'skill').metadata
  } finally {
    await handle.close()
  }
}

function quotePathGlobs(source) {
  let listIndent
  return source.split(/\r?\n/).map((line) => {
    const scalar = /^([ \t]*(?:path|paths):[ \t]*)(![^ \t#]+)([ \t]*(?:#.*)?)$/.exec(line)
    if (scalar) return `${scalar[1]}"${scalar[2]}"${scalar[3]}`
    const field = /^([ \t]*)(?:path|paths):[ \t]*(?:#.*)?$/.exec(line)
    if (field) {
      listIndent = field[1].length
      return line
    }
    if (listIndent === undefined || !line.trim()) return line
    const indent = line.match(/^[ \t]*/)[0].length
    if (indent <= listIndent) {
      listIndent = undefined
      return line
    }
    return line.replace(/^([ \t]*-[ \t]+)([!*?][^ \t#]*)([ \t]*(?:#.*)?)$/, '$1"$2"$3')
  }).join('\n')
}

function parseObject(source) {
  let value
  try {
    value = parseYaml(quotePathGlobs(source))
  } catch (error) {
    throw new MetadataError(`invalid YAML frontmatter: ${error.message}`)
  }
  if (value === null || value === undefined) return {}
  if (!isRecord(value)) throw new MetadataError('YAML frontmatter must be a mapping')
  return value
}

function booleanField(value, field, fallback) {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true': case 'yes': case 'on': return true
      case 'false': case 'no': case 'off': return false
    }
  }
  throw new MetadataError(`frontmatter field "${field}" must be a boolean`)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
