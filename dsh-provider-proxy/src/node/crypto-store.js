import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export function resolveMasterKeyPath(customKeyPath) {
  if (customKeyPath) return customKeyPath
  const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  return join(localAppData, 'kalex-dsh-provider-proxy', 'master.key')
}

export function getOrCreateMasterKey(customKeyPath) {
  const keyPath = resolveMasterKeyPath(customKeyPath)
  try {
    if (existsSync(keyPath)) {
      const hex = readFileSync(keyPath, 'utf8').trim()
      if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, 'hex')
    }
    const key = randomBytes(32)
    mkdirSync(dirname(keyPath), { recursive: true })
    writeFileSync(keyPath, key.toString('hex'), { encoding: 'utf8', mode: 0o600 })
    return key
  } catch {
    // Ephemeral fallback if filesystem is strictly read-only.
    if (!globalThis.__kalexProxyFallbackKey) globalThis.__kalexProxyFallbackKey = randomBytes(32)
    return globalThis.__kalexProxyFallbackKey
  }
}

export function encryptAuthSecret(username, password, masterKey) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', masterKey, iv)
  const payload = JSON.stringify({ username: username || '', password: password || '' })
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptAuthSecret(cipherText, masterKey) {
  if (typeof cipherText !== 'string' || !cipherText.includes(':')) return null
  try {
    const [ivHex, tagHex, dataHex] = cipherText.split(':')
    if (!ivHex || !tagHex || !dataHex) return null
    const decipher = createDecipheriv('aes-256-gcm', masterKey, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8')
    const parsed = JSON.parse(decrypted)
    return {
      username: typeof parsed?.username === 'string' ? parsed.username : '',
      password: typeof parsed?.password === 'string' ? parsed.password : '',
    }
  } catch {
    return null
  }
}

export function maskUsername(username) {
  if (typeof username !== 'string' || !username) return ''
  if (username.length <= 2) return `${username[0]}*`
  return `${username[0]}${'*'.repeat(Math.min(5, username.length - 2))}${username[username.length - 1]}`
}

export function encryptWithPassphrase(username, password, passphrase) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const derivedKey = scryptSync(String(passphrase), salt, 32)
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv)
  const payload = JSON.stringify({ username: username || '', password: password || '' })
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptWithPassphrase(exportCipher, passphrase) {
  if (typeof exportCipher !== 'string' || !exportCipher.includes(':')) {
    throw new Error('Invalid encrypted credential format in import file')
  }
  const parts = exportCipher.split(':')
  if (parts.length !== 4) throw new Error('Invalid encrypted credential format in import file')
  const [saltHex, ivHex, tagHex, dataHex] = parts
  const derivedKey = scryptSync(String(passphrase), Buffer.from(saltHex, 'hex'), 32)
  try {
    const decipher = createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8')
    const parsed = JSON.parse(decrypted)
    return {
      username: typeof parsed?.username === 'string' ? parsed.username : '',
      password: typeof parsed?.password === 'string' ? parsed.password : '',
    }
  } catch {
    throw new Error('Invalid password for encrypted credentials')
  }
}
