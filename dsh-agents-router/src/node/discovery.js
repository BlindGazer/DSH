import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_PROJECT_SETTINGS, parseAreasConfig } from '../config.js'
import { parseInstruction } from './frontmatter.js'
import {
  addRuleFile,
  areaOrder,
  collectRules,
  collectSkills,
  diagnostic,
  discoverAreaFolders,
  findCaseInsensitiveEntry,
  inside,
  relative,
  safeDirectory,
} from './discovery-fs.js'

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0

/** Discover configured project instructions without creating or modifying project files. */
export async function discoverProject(projectPath, settings = DEFAULT_PROJECT_SETTINGS) {
  const diagnostics = []
  const snapshot = { projectRoot: undefined, instructionsRoot: undefined, rules: [], skills: [], areas: new Map(), areasConfigValid: false, diagnostics, complete: true, rulesComplete: true }
  let projectRoot
  try {
    projectRoot = await realpath(projectPath)
    if (!(await stat(projectRoot)).isDirectory()) throw new Error('project root is not a directory')
  } catch (error) {
    diagnostics.push(diagnostic('project-root', projectPath, `cannot open project root: ${error.message}`))
    snapshot.complete = !['EACCES', 'EPERM', 'EIO'].includes(error.code)
    snapshot.rulesComplete = snapshot.complete
    return snapshot
  }
  snapshot.projectRoot = projectRoot
  const rootLexical = path.resolve(projectRoot, ...settings.instructionsRoot.split('/'))
  const instructionsRoot = await safeDirectory(rootLexical, projectRoot, diagnostics, 'instructions-root')
  if (!instructionsRoot) {
    snapshot.rulesComplete = !diagnostics.some(({ message }) => /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message))
    return snapshot
  }
  snapshot.instructionsRoot = instructionsRoot

  const configDirectory = path.join(instructionsRoot, 'dsh')
  const configFile = await findCaseInsensitiveEntry(configDirectory, 'agents-router.json', diagnostics, projectRoot)
  let configText
  if (configFile) {
    try {
      const canonicalConfig = await realpath(configFile)
      if (!inside(projectRoot, canonicalConfig)) throw new Error('symbolic link points outside the project')
      configText = await readFile(canonicalConfig, 'utf8')
    } catch (error) {
      diagnostics.push(diagnostic('area-config', relative(projectRoot, configFile), `cannot read area config: ${error.message}`))
    }
  }
  const parsed = configText === undefined ? { areas: new Map(), errors: [], valid: true } : parseAreasConfig(configText, settings)
  snapshot.areasConfigValid = Boolean(configFile && configText !== undefined && parsed.valid && parsed.errors.length === 0)
  for (const message of parsed.errors) diagnostics.push(diagnostic('area-config', relative(projectRoot, configFile ?? path.join(configDirectory, 'agents-router.json')), message))
  await discoverAreaFolders(instructionsRoot, parsed.areas, settings, projectRoot, diagnostics)
  snapshot.areas = parsed.areas

  await addRuleFile(path.join(instructionsRoot, settings.mainFile), 'global', projectRoot, snapshot.rules, diagnostics, true)
  await collectRules(path.join(instructionsRoot, settings.rulesFolder), 'global', projectRoot, snapshot.rules, diagnostics)
  await collectSkills(path.join(instructionsRoot, settings.skillsFolder), 'global', projectRoot, snapshot.skills, diagnostics)
  for (const [name, area] of [...parsed.areas].sort(([a], [b]) => compare(a, b))) {
    if (!area.available || !area.enabled) continue
    const directory = path.join(instructionsRoot, ...name.split('/'))
    await addRuleFile(path.join(directory, settings.mainFile), name, projectRoot, snapshot.rules, diagnostics, true)
    await collectRules(path.join(directory, settings.rulesFolder), name, projectRoot, snapshot.rules, diagnostics)
    await collectSkills(path.join(directory, settings.skillsFolder), name, projectRoot, snapshot.skills, diagnostics)
  }
  snapshot.rules.sort((a, b) => compare(areaOrder(a.area), areaOrder(b.area)) || compare(a.sourcePath, b.sourcePath))
  snapshot.skills.sort((a, b) => compare(a.name, b.name) || compare(a.sourcePath, b.sourcePath))
  snapshot.complete = !diagnostics.some(({ code, message }) => ['skills-folder', 'skill-folder', 'file-discovery'].includes(code) && /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message))
  snapshot.rulesComplete = !diagnostics.some(({ code, message }) => ['rules-folder', 'file-discovery'].includes(code) && /EACCES|EPERM|EIO|EMFILE|ENFILE/.test(message))
  return snapshot
}

/** Load a skill's full body only after the native DSH loader asks for it. */
export async function loadSkillDefinition(projectRoot, settings, locator) {
  let canonicalRoot
  try { canonicalRoot = await realpath(projectRoot) } catch { return undefined }
  const snapshot = await discoverProject(canonicalRoot, settings)
  const matchingNames = snapshot.skills.filter((skill) => skill.name === locator?.name && skill.enabled)
  if (matchingNames.length !== 1) return undefined
  const current = matchingNames.find((skill) => skill.sourcePath === locator?.sourcePath)
  if (!current) return undefined
  try {
    const canonicalFile = await realpath(current.filePath)
    if (!inside(canonicalRoot, canonicalFile)) return undefined
    const text = await readFile(canonicalFile, 'utf8')
    const { metadata, content } = parseInstruction(text, 'skill')
    if (!metadata.enabled) return undefined
    return {
      ...current,
      description: metadata.description,
      whenToUse: metadata.whenToUse,
      invocation: { modelInvocable: metadata.modelInvocable, userInvocable: metadata.userInvocable },
      metadata: metadata.metadata,
      content,
    }
  } catch { return undefined }
}

export { diagnosePath, renderRules, selectRules } from './rule-selector.js'
