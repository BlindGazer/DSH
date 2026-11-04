import { realpath } from 'node:fs/promises'
import path from 'node:path'

const FILE_TOOLS = new Set(['read', 'read_image', 'write', 'edit', 'str_replace_editor'])
const SEARCH_TOOLS = new Set(['glob', 'grep'])

export function isFileTool(name) {
  return FILE_TOOLS.has(name)
}

export function isSearchTool(name) {
  return SEARCH_TOOLS.has(name)
}

/** Validate one known file call before any sibling in the same assistant batch runs. */
export function extractFileOperation(name, args) {
  if (!FILE_TOOLS.has(name)) return { paths: [] }
  if (!isRecord(args)) return { error: `${name} arguments must be an object` }
  let field = 'file_path'
  if (name === 'str_replace_editor') {
    field = 'path'
    if (typeof args.command !== 'string' || args.command.length === 0) return { error: 'str_replace_editor requires a command' }
  }
  if (typeof args[field] !== 'string' || args[field].trim() === '') return { error: `${name} requires a non-empty ${field}` }
  return { paths: [args[field]] }
}

/** Read all file calls in a model-authored message, or one PTC child call. */
export function fileBatch(agent, exec) {
  if (exec.parent !== undefined) {
    const operation = extractFileOperation(exec.name, exec.arguments)
    return operation.error ? { error: operation.error, calls: [{ callId: exec.callId, name: exec.name }] }
      : { calls: [{ callId: exec.callId, name: exec.name, paths: operation.paths }] }
  }
  const messages = agent?.session?.deriveMessages?.() ?? []
  let batch
  for (let i = messages.length - 1; i >= 0 && !batch; i--) {
    const message = messages[i]
    if (message.role !== 'assistant' || !Array.isArray(message.content)) continue
    if (message.content.some((block) => block.type === 'tool-call' && block.id === exec.callId)) batch = message.content.filter((block) => block.type === 'tool-call')
  }
  if (!batch) return { error: 'the assistant tool-call batch is unavailable for safe preflight', calls: [{ callId: exec.callId, name: exec.name }] }
  const calls = []
  let error
  for (const block of batch) {
    if (!FILE_TOOLS.has(block.name)) continue
    let args
    if (block.id === exec.callId) args = exec.arguments
    else {
      try { args = typeof block.arguments === 'string' ? JSON.parse(block.arguments) : block.arguments }
      catch { error ??= `${block.name} arguments are not valid JSON` }
    }
    const operation = extractFileOperation(block.name, args)
    error ??= operation.error
    calls.push({ callId: block.id, name: block.name, paths: operation.paths ?? [] })
  }
  if (!calls.some((call) => call.callId === exec.callId)) {
    return { error: 'the current file call is not present in the assistant tool-call batch', calls: [{ callId: exec.callId, name: exec.name }] }
  }
  return { calls, ...(error ? { error } : {}) }
}

/** Resolve aliases against the current Session directory and return project-relative forms. */
export async function projectPaths(projectRoot, workingDirectory, rawPath) {
  if (typeof rawPath !== 'string' || rawPath.trim() === '') return []
  let lexical
  try { lexical = path.resolve(workingDirectory, rawPath) } catch { return [] }
  const paths = new Set()
  const lexicalRelative = relativeInside(projectRoot, lexical)
  if (lexicalRelative !== undefined) paths.add(lexicalRelative)
  try {
    const canonical = await realpath(lexical)
    const canonicalRelative = relativeInside(projectRoot, canonical)
    if (canonicalRelative !== undefined) paths.add(canonicalRelative)
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
    let ancestor = lexical
    const tail = []
    while (true) {
      const parent = path.dirname(ancestor)
      if (parent === ancestor) break
      tail.unshift(path.basename(ancestor))
      ancestor = parent
      try {
        const canonicalParent = await realpath(ancestor)
        const canonicalCandidate = path.resolve(canonicalParent, ...tail)
        const canonicalRelative = relativeInside(projectRoot, canonicalCandidate)
        if (canonicalRelative !== undefined) paths.add(canonicalRelative)
        break
      } catch (parentError) {
        if (parentError.code !== 'ENOENT' && parentError.code !== 'ENOTDIR') throw parentError
      }
    }
  }
  return [...paths]
}

function relativeInside(root, target) {
  const rel = path.relative(root, target)
  if (rel === '' || rel === '.') return '.'
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return undefined
  return rel.split(path.sep).join('/')
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
