import { createHash } from 'node:crypto'
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { parseInstruction, readSkillMetadata } from './frontmatter.js'
import { parentsAvailable } from './rule-selector.js'

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0

export async function discoverAreaFolders(instructionsRoot, areas, settings, projectRoot, diagnostics) {
  const reserved = new Set(['dsh', settings.rulesFolder.toLowerCase(), settings.skillsFolder.toLowerCase()])
  let entries
  try { entries = await readdir(instructionsRoot, { withFileTypes: true }) }
  catch (error) {
    diagnostics.push(diagnostic('instructions-root', relative(projectRoot, instructionsRoot), `cannot list instruction root: ${error.message}`))
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    if (reserved.has(entry.name.toLowerCase())) continue
    if (![...areas.keys()].some((name) => name.split('/')[0] === entry.name)) {
      diagnostics.push(diagnostic('unconfigured-area', relative(projectRoot, path.join(instructionsRoot, entry.name)), 'unconfigured area folder is ignored'))
    }
  }
  for (const [name, area] of areas) {
    if (!area.enabled || !parentsAvailable(area, areas)) {
      area.available = false
      continue
    }
    const folder = path.join(instructionsRoot, ...name.split('/'))
    area.directory = folder
    area.available = Boolean(await safeDirectory(folder, projectRoot, diagnostics, 'missing-area'))
  }
  for (const [name, area] of areas) {
    if (!area.available) continue
    let children
    try { children = await readdir(area.directory, { withFileTypes: true }) } catch { continue }
    for (const entry of children) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      if (reserved.has(entry.name.toLowerCase()) || areas.has(`${name}/${entry.name}`)) continue
      diagnostics.push(diagnostic('unconfigured-area', relative(projectRoot, path.join(area.directory, entry.name)), 'unconfigured area folder is ignored'))
    }
  }
}

export async function addRuleFile(filePath, area, projectRoot, rules, diagnostics, optional) {
  const existing = await findCaseInsensitiveEntry(path.dirname(filePath), path.basename(filePath), diagnostics, projectRoot)
  if (!existing) {
    if (!optional) diagnostics.push(diagnostic('missing-rule-folder', relative(projectRoot, filePath), 'configured rule source is missing'))
    return
  }
  await parseRuleFile(existing, area, projectRoot, rules, diagnostics)
}

export async function collectRules(directory, area, projectRoot, rules, diagnostics) {
  for (const file of await collectMarkdown(directory, projectRoot, diagnostics)) await parseRuleFile(file, area, projectRoot, rules, diagnostics)
}

async function parseRuleFile(filePath, area, projectRoot, rules, diagnostics) {
  try {
    const canonical = await realpath(filePath)
    if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project')
    const text = await readFile(canonical, 'utf8')
    const { metadata, content } = parseInstruction(text, 'rule')
    const sourcePath = relative(projectRoot, filePath)
    const hash = digest(text)
    rules.push({ id: `${sourcePath}:${hash}`, hash, sourcePath, filePath, area, path: metadata.path, description: metadata.description, enabled: metadata.enabled, content })
  } catch (error) {
    diagnostics.push(diagnostic('rule-file', relative(projectRoot, filePath), error.message))
  }
}

export async function collectSkills(directory, area, projectRoot, skills, diagnostics) {
  const canonical = await safeDirectory(directory, projectRoot, diagnostics, 'skills-folder', true)
  if (!canonical) return
  let entries
  try { entries = await readdir(canonical, { withFileTypes: true }) }
  catch (error) {
    if (error.code !== 'ENOENT') diagnostics.push(diagnostic('skills-folder', relative(projectRoot, canonical), `cannot list skills: ${error.message}`))
    return
  }
  for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
      diagnostics.push(diagnostic('skill-name', relative(projectRoot, path.join(canonical, entry.name)), 'skill folder name must use lowercase letters, digits, and hyphens'))
      continue
    }
    const skillDir = await safeDirectory(path.join(canonical, entry.name), projectRoot, diagnostics, 'skill-folder')
    if (!skillDir) continue
    const skillFile = await findCaseInsensitiveEntry(skillDir, 'SKILL.md', diagnostics, projectRoot)
    if (!skillFile) {
      diagnostics.push(diagnostic('skill-file', relative(projectRoot, skillDir), 'missing SKILL.md; skill is ignored'))
      continue
    }
    try {
      const canonicalFile = await realpath(skillFile)
      if (!inside(projectRoot, canonicalFile)) throw new Error('symbolic link points outside the project')
      const metadata = await readSkillMetadata(canonicalFile)
      const fileInfo = await stat(canonicalFile)
      const name = area === 'global' ? entry.name : `${area.replaceAll('/', '-')}-${entry.name}`
      const hash = digest(`${metadata.description}\0${metadata.whenToUse ?? ''}\0${fileInfo.size}\0${fileInfo.mtimeMs}`)
      skills.push({
        name, folderName: entry.name, sourcePath: relative(projectRoot, skillFile), filePath: skillFile, area,
        description: metadata.description, whenToUse: metadata.whenToUse, enabled: metadata.enabled,
        invocation: { modelInvocable: metadata.modelInvocable, userInvocable: metadata.userInvocable }, metadata: metadata.metadata, hash,
        license: metadata.license, compatibility: metadata.compatibility, 'allowed-tools': metadata['allowed-tools'],
      })
    } catch (error) {
      diagnostics.push(diagnostic('skill-file', relative(projectRoot, skillFile), error.message))
    }
  }
}

async function collectMarkdown(directory, projectRoot, diagnostics) {
  const files = []
  const seenDirectories = new Set()
  const seenFiles = new Set()
  await walk(directory)
  return files.sort(compare)

  async function walk(current, viaSymlink = false) {
    const canonical = await safeDirectory(current, projectRoot, diagnostics, 'rules-folder', true)
    if (!canonical) return
    if (seenDirectories.has(canonical)) {
      if (viaSymlink) diagnostics.push(diagnostic('symlink-cycle', relative(projectRoot, current), 'cyclic or duplicate directory link skipped'))
      return
    }
    seenDirectories.add(canonical)
    let entries
    try { entries = await readdir(current, { withFileTypes: true }) }
    catch (error) {
      diagnostics.push(diagnostic('rules-folder', relative(projectRoot, current), `cannot list rules: ${error.message}`))
      return
    }
    for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
      const candidate = path.join(current, entry.name)
      if (entry.isDirectory()) { await walk(candidate); continue }
      if (entry.isSymbolicLink()) {
        try {
          const target = await realpath(candidate)
          if (!inside(projectRoot, target)) throw new Error('symbolic link points outside the project')
          const info = await stat(target)
          if (info.isDirectory()) await walk(candidate, true)
          else if (info.isFile()) await addFile(candidate, target)
        } catch (error) {
          diagnostics.push(diagnostic('symlink', relative(projectRoot, candidate), error.message))
        }
      } else if (entry.isFile()) await addFile(candidate, candidate)
    }
  }

  async function addFile(displayPath, targetPath) {
    if (path.extname(displayPath).toLowerCase() !== '.md') return
    try {
      const canonical = await realpath(targetPath)
      if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project')
      if (seenFiles.has(canonical)) return
      seenFiles.add(canonical)
      files.push(displayPath)
    } catch (error) {
      diagnostics.push(diagnostic('rule-file', relative(projectRoot, displayPath), error.message))
    }
  }
}

export async function safeDirectory(candidate, projectRoot, diagnostics, code, quietMissing = false) {
  try {
    const canonical = await realpath(candidate)
    if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project')
    if (!(await stat(canonical)).isDirectory()) throw new Error('expected a directory')
    return canonical
  } catch (error) {
    if (!(quietMissing && error.code === 'ENOENT')) diagnostics.push(diagnostic(code, relative(projectRoot, candidate), error.message))
    return undefined
  }
}

export async function findCaseInsensitiveEntry(directory, wanted, diagnostics, projectRoot) {
  let entries
  try {
    const canonicalDirectory = await realpath(directory)
    if (!inside(projectRoot, canonicalDirectory)) throw new Error('symbolic link points outside the project')
    if (!(await stat(canonicalDirectory)).isDirectory()) throw new Error('expected a directory')
    entries = await readdir(canonicalDirectory)
  } catch (error) {
    if (error.code !== 'ENOENT') diagnostics.push(diagnostic('file-discovery', relative(projectRoot, directory), error.message))
    return undefined
  }
  const matches = entries.filter((name) => name.toLowerCase() === wanted.toLowerCase()).sort(compare)
  if (matches.length > 1) {
    diagnostics.push(diagnostic('case-collision', relative(projectRoot, directory), `multiple case variants of ${wanted}; none selected`))
    return undefined
  }
  if (!matches.length) return undefined
  const filePath = path.join(directory, matches[0])
  try {
    const canonical = await realpath(filePath)
    if (!inside(projectRoot, canonical)) throw new Error('symbolic link points outside the project')
    if (!(await stat(canonical)).isFile()) throw new Error('expected a file')
    return filePath
  } catch (error) {
    diagnostics.push(diagnostic('file-discovery', relative(projectRoot, filePath), error.message))
    return undefined
  }
}

export function inside(root, target) {
  const rel = path.relative(root, target)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}

export function relative(root, target) {
  return path.relative(root, target).split(path.sep).join('/')
}

export function areaOrder(area) {
  return area === 'global' ? '' : area
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function diagnostic(code, pathValue, message) {
  return { code, path: pathValue, message, key: `${code}:${pathValue}:${message}` }
}
