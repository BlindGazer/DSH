import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS, validateGlobalSettings, validateProjectSettings } from '../config.js'
import { AuditStorage } from './audit-storage.js'

const VERSION = 1
const EMPTY_SESSION = (sessionId, projectRoot) => ({ version: VERSION, sessionId, projectRoot, activePaths: [], seenDiagnostics: [] })

/** Plugin-owned data below DSH home; project roots are read-only instruction sources. */
export class RouterStore {
  constructor(dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')) {
    this.home = path.resolve(dshHome)
    this.base = path.join(this.home, 'agents-router')
    this.queues = new Map()
    this.auditStorage = new AuditStorage(this)
  }

  async loadGlobalSettings() {
    try {
      const record = await this.readJson(this.globalSettingsFile())
      const checked = validateGlobalSettings(record.settings)
      if (record.version !== VERSION || !checked.valid) throw new Error(checked.errors.join('; ') || 'unsupported settings version')
      return { settings: checked.settings, warning: undefined }
    } catch (error) {
      if (error.code === 'ENOENT') return { settings: DEFAULT_GLOBAL_SETTINGS, warning: undefined }
      return { settings: DEFAULT_GLOBAL_SETTINGS, warning: `global settings could not be restored: ${error.message}` }
    }
  }

  async saveGlobalSettings(input) {
    const checked = validateGlobalSettings(input)
    if (!checked.valid) return { saved: false, settings: (await this.loadGlobalSettings()).settings, errors: checked.errors }
    return this.serial('global-settings', async () => {
      await this.writeJson(this.globalSettingsFile(), { version: VERSION, settings: checked.settings })
      if (!checked.settings.globalLogging) await this.deleteAllAuditLogs()
      return { saved: true, settings: checked.settings, errors: [] }
    })
  }

  async loadProjectSettings(projectRoot) {
    const file = this.projectFile(projectRoot)
    try {
      const record = await this.readJson(file)
      if (record.projectRoot !== projectRoot) throw new Error('stored project identity does not match')
      const checked = validateProjectSettings(record.settings)
      if (!checked.valid) throw new Error(checked.errors.join('; '))
      return { settings: checked.settings, warning: undefined }
    } catch (error) {
      if (error.code === 'ENOENT') return { settings: DEFAULT_PROJECT_SETTINGS, warning: undefined }
      return { settings: DEFAULT_PROJECT_SETTINGS, warning: `project settings could not be restored: ${error.message}` }
    }
  }

  async saveProjectSettings(projectRoot, input) {
    const checked = validateProjectSettings(input)
    if (!checked.valid) return { saved: false, settings: (await this.loadProjectSettings(projectRoot)).settings, errors: checked.errors }
    return this.serial(`project:${this.projectId(projectRoot)}`, async () => {
      await this.writeJson(this.projectFile(projectRoot), { version: VERSION, projectRoot, settings: checked.settings })
      if (!checked.settings.projectLogging) await this.deleteProjectAuditLogs(projectRoot)
      return { saved: true, settings: checked.settings, errors: [] }
    })
  }

  appendAuditLog(...args) { return this.auditStorage.appendAuditLog(...args) }
  readAuditLog(...args) { return this.auditStorage.readAuditLog(...args) }
  deleteSessionAuditLog(...args) { return this.auditStorage.deleteSessionAuditLog(...args) }
  deleteProjectAuditLogs(...args) { return this.auditStorage.deleteProjectAuditLogs(...args) }
  deleteAllAuditLogs(...args) { return this.auditStorage.deleteAllAuditLogs(...args) }

  async loadSession(sessionId, projectRoot) {
    try {
      const state = await this.readJson(this.sessionFile(sessionId))
      if (state.version !== VERSION || state.sessionId !== sessionId || state.projectRoot !== projectRoot) {
        throw new Error('stored session identity does not match the current DSH session')
      }
      return { state: normalizeSession(state, sessionId, projectRoot), warning: undefined, missing: false }
    } catch (error) {
      if (error.code === 'ENOENT') return { state: EMPTY_SESSION(sessionId, projectRoot), warning: undefined, missing: true }
      return { state: EMPTY_SESSION(sessionId, projectRoot), warning: `session working set could not be restored: ${error.message}`, missing: false }
    }
  }

  async updateSession(sessionId, projectRoot, update) {
    return this.serial(`session:${this.sessionId(sessionId)}`, async () => {
      const { state, warning } = await this.loadSession(sessionId, projectRoot)
      const next = normalizeSession(await update(state), sessionId, projectRoot)
      await this.writeJson(this.sessionFile(sessionId), next)
      return { state: next, warning }
    })
  }

  async markDiagnostics(sessionId, projectRoot, diagnostics) {
    const fresh = []
    await this.updateSession(sessionId, projectRoot, (state) => {
      const seen = new Set(state.seenDiagnostics)
      for (const item of diagnostics) {
        if (!seen.has(item.key)) fresh.push(item)
        seen.add(item.key)
      }
      return { ...state, seenDiagnostics: [...seen].slice(-1000) }
    })
    return fresh
  }

  async resetSession(sessionId, projectRoot) {
    return this.updateSession(sessionId, projectRoot, (state) => ({ ...state, activePaths: [] }))
  }

  projectId(projectRoot) {
    const key = process.platform === 'win32' ? projectRoot.toLowerCase() : projectRoot
    return hash(key)
  }

  sessionId(sessionId) {
    if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sessionId)) throw new Error('invalid DSH session id')
    return hash(sessionId)
  }

  projectFile(projectRoot) {
    return path.join(this.base, 'projects', `${this.projectId(projectRoot)}.json`)
  }

  sessionFile(sessionId) {
    return path.join(this.base, 'sessions', `${this.sessionId(sessionId)}.json`)
  }

  globalSettingsFile() {
    return path.join(this.base, 'global-settings.json')
  }

  logsDirectory() {
    return path.join(this.base, 'logs')
  }

  auditFile(projectRoot, sessionId) {
    return path.join(this.logsDirectory(), `${this.projectId(projectRoot)}-${this.sessionId(sessionId)}.log.md`)
  }

  async readJson(file) {
    const text = await readFile(file, 'utf8')
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('sidecar JSON must be an object')
    return value
  }

  async writeJson(file, value) {
    await mkdir(this.home, { recursive: true, mode: 0o700 })
    const safeHome = await realpath(this.home)
    await mkdir(this.base, { recursive: true, mode: 0o700 })
    let directory = this.base
    const baseInfo = await lstat(directory)
    if (!baseInfo.isDirectory() || baseInfo.isSymbolicLink() || !inside(safeHome, await realpath(directory))) {
      throw new Error('sidecar storage resolves outside DSH home')
    }
    const subdirectory = path.relative(this.base, path.dirname(file))
    if (subdirectory.startsWith('..') || path.isAbsolute(subdirectory)) throw new Error('sidecar path is outside plugin storage')
    for (const segment of subdirectory.split(path.sep).filter(Boolean)) {
      directory = path.join(directory, segment)
      await mkdir(directory, { recursive: false, mode: 0o700 }).catch((error) => { if (error.code !== 'EEXIST') throw error })
      const info = await lstat(directory)
      if (!info.isDirectory() || info.isSymbolicLink() || !inside(safeHome, await realpath(directory))) {
        throw new Error('sidecar directory resolves outside DSH home')
      }
    }
    const temporary = `${file}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      await rename(temporary, file)
    } catch (error) {
      try { await unlink(temporary) } catch (cleanupError) { if (cleanupError.code !== 'ENOENT') throw cleanupError }
      throw error
    }
  }

  serial(key, operation) {
    const previous = this.queues.get(key) ?? Promise.resolve()
    const current = previous.then(operation, operation)
    this.queues.set(key, current.catch(() => {}))
    return current
  }
}

function normalizeSession(value, sessionId, projectRoot) {
  if (!value || !Array.isArray(value.activePaths) || !value.activePaths.every((item) => typeof item === 'string')) {
    throw new Error('session sidecar has invalid active paths')
  }
  if (!Array.isArray(value.seenDiagnostics) || !value.seenDiagnostics.every((item) => typeof item === 'string')) {
    throw new Error('session sidecar has invalid diagnostic history')
  }
  const activePaths = [...new Map(value.activePaths.map((item) => [item.toLowerCase(), item])).values()]
  return { version: VERSION, sessionId, projectRoot, activePaths, seenDiagnostics: value.seenDiagnostics.slice(-1000) }
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function inside(root, target) {
  const rel = path.relative(root, target)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}
