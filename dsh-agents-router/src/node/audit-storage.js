import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const MAX_LOG_ENTRIES = 200
const MAX_LOG_BYTES = 256 * 1024

export class AuditStorage {
  constructor(store) {
    this.store = store
  }

  async appendAuditLog(projectRoot, sessionId, entry) {
    const [{ settings: global }, { settings: project }] = await Promise.all([
      this.store.loadGlobalSettings(), this.store.loadProjectSettings(projectRoot),
    ])
    if (!global.globalLogging || !project.projectLogging || typeof entry !== 'string' || entry.length === 0) return false
    const file = this.store.auditFile(projectRoot, sessionId)
    return this.store.serial(file, async () => {
      await this.auditDirectory(true)
      let current = ''
      try {
        const info = await lstat(file)
        if (!info.isFile() || info.nlink !== 1) throw new Error('audit log path is not a private regular file')
        current = await readFile(file, 'utf8')
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      const blocks = `${current}${current ? '\n\n' : ''}## #${current ? current.split(/^## #/m).length : 1} [${new Date().toISOString().slice(11, 19)}]\n${entry}`.split(/(?=^## #)/m).filter(Boolean)
      while (blocks.length > MAX_LOG_ENTRIES || Buffer.byteLength(blocks.join(''), 'utf8') > MAX_LOG_BYTES) {
        if (blocks.length <= 1) {
          blocks[0] = blocks[0].slice(-MAX_LOG_BYTES)
          break
        }
        blocks.shift()
      }
      await this.writeAuditFile(file, blocks.join('').trimStart())
      return true
    })
  }

  async readAuditLog(projectRoot, sessionId) {
    const directory = await this.auditDirectory(false)
    if (!directory) return ''
    const file = path.join(directory, path.basename(this.store.auditFile(projectRoot, sessionId)))
    try {
      const info = await lstat(file)
      if (!info.isFile() || info.nlink !== 1) throw new Error('audit log path is not a private regular file')
      return await readFile(file, 'utf8')
    } catch (error) { if (error.code === 'ENOENT') return ''; throw error }
  }

  deleteSessionAuditLog(projectRoot, sessionId) {
    return this.deleteAuditFiles((name) => name === path.basename(this.store.auditFile(projectRoot, sessionId)))
  }

  deleteProjectAuditLogs(projectRoot) {
    const prefix = `${this.store.projectId(projectRoot)}-`
    return this.deleteAuditFiles((name) => name.startsWith(prefix) && name.endsWith('.log.md'))
  }

  deleteAllAuditLogs() {
    return this.deleteAuditFiles((name) => name.endsWith('.log.md'))
  }

  async deleteAuditFiles(match) {
    const directory = await this.auditDirectory(false)
    if (!directory) return 0
    const files = await readdir(directory, { withFileTypes: true })
    let deleted = 0
    for (const file of files) {
      if ((!file.isFile() && !file.isSymbolicLink()) || !match(file.name)) continue
      await unlink(path.join(directory, file.name))
      deleted++
    }
    return deleted
  }

  async auditDirectory(create) {
    const store = this.store
    let safeHome
    try { safeHome = await realpath(store.home) }
    catch (error) {
      if (error.code !== 'ENOENT' || !create) return undefined
      await mkdir(store.home, { recursive: true, mode: 0o700 })
      safeHome = await realpath(store.home)
    }
    let safeBase
    try { safeBase = await realpath(store.base) }
    catch (error) {
      if (error.code !== 'ENOENT' || !create) return undefined
      await mkdir(store.base, { recursive: true, mode: 0o700 })
      safeBase = await realpath(store.base)
    }
    const baseInfo = await lstat(store.base)
    if (!baseInfo.isDirectory() || baseInfo.isSymbolicLink() || !inside(safeHome, safeBase)) {
      throw new Error('audit storage resolves outside DSH home')
    }
    const directory = store.logsDirectory()
    if (create) await mkdir(directory, { recursive: true, mode: 0o700 })
    let safeDirectory
    try { safeDirectory = await realpath(directory) }
    catch (error) { if (error.code === 'ENOENT') return undefined; throw error }
    const directoryInfo = await lstat(directory)
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink() || !inside(safeHome, safeDirectory)) {
      throw new Error('audit log directory resolves outside DSH home')
    }
    return safeDirectory
  }

  async writeAuditFile(file, text) {
    await this.auditDirectory(true)
    try {
      const info = await lstat(file)
      if (!info.isFile() || info.nlink !== 1) throw new Error('audit log path is not a private regular file')
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    const temporary = `${file}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, text, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      await rename(temporary, file)
    } catch (error) {
      try { await unlink(temporary) } catch (cleanupError) { if (cleanupError.code !== 'ENOENT') throw cleanupError }
      throw error
    }
  }
}

function inside(root, target) {
  const rel = path.relative(root, target)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}
