import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { normalizeProxyConfig, serializeConfigForDisk } from './config-normalizer.js'

export function resolveStoragePath(customStoragePath) {
  if (customStoragePath) return customStoragePath
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(dshHome, 'kalex-provider-proxy.json')
}

export function loadConfigFromDisk(storagePath, fallbackConfig = {}, masterKey = null) {
  try {
    if (existsSync(storagePath)) {
      const rawText = readFileSync(storagePath, 'utf8')
      const parsed = JSON.parse(rawText)
      const normalized = normalizeProxyConfig(parsed, masterKey)
      const hadPlaintext = Array.isArray(parsed?.profiles) && parsed.profiles.some((profile) => profile?.auth?.username || profile?.auth?.password)
      if (hadPlaintext && masterKey) saveConfigToDisk(storagePath, normalized, masterKey)
      return normalized
    }
  } catch {
    // Ignore corrupt files and use defaults.
  }
  return normalizeProxyConfig(fallbackConfig, masterKey)
}

export function saveConfigToDisk(storagePath, config, masterKey) {
  try {
    mkdirSync(dirname(storagePath), { recursive: true })
    const diskPayload = masterKey ? serializeConfigForDisk(config, masterKey) : config
    writeFileSync(storagePath, JSON.stringify(diskPayload, null, 2), 'utf8')
  } catch {
    // Ignore write errors in read-only environments.
  }
}
