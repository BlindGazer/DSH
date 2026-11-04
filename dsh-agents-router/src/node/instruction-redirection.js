import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { inside } from './discovery-fs.js'

export function matchInstructionRedirect(paths, settings) {
  const segments = paths.map((value) => value.split('/'))
  if (segments.some(([first]) => sameName(first, 'agents'))) return undefined

  if (settings.redirectRootInstructionFiles) {
    for (const parts of segments) {
      if (parts.length === 1 && settings.rootInstructionFileNames.some((name) => sameName(name, parts[0]))) return parts[0]
    }
  }
  if (settings.redirectInstructionDirectories) {
    for (const parts of segments) {
      if (parts.length > 1 && settings.instructionDirectoryNames.some((name) => sameName(name, parts[0]))) return parts.slice(1).join('/')
    }
  }
  return undefined
}

export function filterRootInstructionMessages(messages, rootInstructionFileNames) {
  if (!Array.isArray(messages) || !Array.isArray(rootInstructionFileNames) || !rootInstructionFileNames.length) return messages
  let changed = false
  const filtered = messages.flatMap((message) => {
    const source = message?.source
    if (source?.kind !== 'agent-instructions' || !Array.isArray(source.changes)) return [message]
    const removed = new Set(source.changes.filter((change) => typeof change?.path === 'string'
      && !change.path.includes('/') && !change.path.includes('\\')
      && rootInstructionFileNames.some((name) => typeof name === 'string' && sameName(name, change.path))))
    if (!removed.size) return [message]
    changed = true

    const headers = source.changes.map((change) => ({ change, header: instructionSectionHeader(change) }))
    const textIndex = message.content?.findIndex((block) => block?.type === 'text' && typeof block.text === 'string') ?? -1
    // При неизвестном формате убираем сообщение целиком, чтобы не передать исходные инструкции.
    if (headers.some(({ header }) => !header) || textIndex < 0) return []
    const text = message.content[textIndex].text
    const sections = []
    let cursor = 0
    for (const entry of headers) {
      const start = findInstructionHeader(text, entry.header, cursor)
      if (start < 0) return []
      sections.push({ ...entry, start })
      cursor = start + entry.header.length
    }
    const content = text.slice(0, sections[0].start) + sections.flatMap((section, index) => {
      if (removed.has(section.change)) return []
      const end = sections[index + 1]?.start ?? text.length
      return [text.slice(section.start, end)]
    }).join('')
    const changes = source.changes.filter((change) => !removed.has(change))
    if (!changes.length) return []
    const nextContent = [...message.content]
    nextContent[textIndex] = { ...nextContent[textIndex], text: content }
    return [{ ...message, content: nextContent, source: { ...source, changes } }]
  })
  return changed ? filtered : messages
}

export async function resolveInstructionDestination(projectRoot, relativeTarget) {
  if (typeof relativeTarget !== 'string' || !relativeTarget || path.isAbsolute(relativeTarget) || path.win32.isAbsolute(relativeTarget)) {
    throw new Error('redirect destination is not a safe project-relative path')
  }
  const segments = relativeTarget.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\') || segment.includes('\0'))) {
    throw new Error('redirect destination is not a safe project-relative path')
  }
  const canonicalProject = await realpath(projectRoot)
  const lexicalAgents = path.resolve(canonicalProject, 'agents')
  const canonicalAgents = await realpath(lexicalAgents)
  if (!inside(canonicalProject, canonicalAgents)) throw new Error('agents directory resolves outside the project')
  const lexicalTarget = path.resolve(lexicalAgents, ...segments)
  if (!inside(lexicalAgents, lexicalTarget) || lexicalTarget === lexicalAgents) throw new Error('redirect destination escapes agents')
  const canonicalTarget = await realpath(lexicalTarget)
  if (!inside(canonicalAgents, canonicalTarget)) throw new Error('redirect destination resolves outside agents')
  if (!(await stat(canonicalTarget)).isFile()) throw new Error('redirect destination is not a file')
  return canonicalTarget
}

function instructionSectionHeader(change) {
  const prefix = change?.action === 'set' ? 'Instructions from: '
    : change?.action === 'replace' ? 'Updated instructions from: '
      : change?.action === 'remove' ? 'Instructions removed: ' : undefined
  return prefix && typeof change.path === 'string' ? `${prefix}${change.path}\n\n` : undefined
}

function findInstructionHeader(text, header, from) {
  let index = text.indexOf(header, from)
  while (index >= 0) {
    if (index === 0 || text[index - 1] === '\n') return index
    index = text.indexOf(header, index + 1)
  }
  return -1
}

function sameName(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right
}
