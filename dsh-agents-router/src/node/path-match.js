const GLOB_META = /[?*]/

/** Return a normalized, project-relative POSIX path or undefined if it escapes the root. */
export function projectRelativePath(projectRoot, candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) return undefined
  const root = resolve(projectRoot)
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate)
  const rel = relative(root, absolute)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return undefined
  return rel.split(sep).join('/')
}

/** Match a rule/area path filter against one project-relative path. */
export function matchesPath(candidate, filter) {
  return explainPathMatch(candidate, filter).matched
}

/** Explain the last matching include/exclude rule for a project-relative path. */
export function explainPathMatch(candidate, filter) {
  if (filter === undefined || filter === null || filter === '' || (Array.isArray(filter) && filter.length === 0)) {
    return { matched: true, reason: 'unrestricted' }
  }
  const path = normalize(candidate).toLowerCase()
  const rawList = (Array.isArray(filter) ? filter : [filter])
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
  if (!rawList.length) return { matched: false, reason: 'invalid filter' }
  const parsed = rawList.map((raw) => {
    const trimmed = raw.trim()
    const negated = trimmed.startsWith('!')
    return { raw: trimmed, negated, pattern: normalize(negated ? trimmed.slice(1).trim() : trimmed).toLowerCase() }
  }).filter(({ pattern }) => pattern.length > 0)
  if (!parsed.length) return { matched: false, reason: 'invalid filter' }
  const hasPositive = parsed.some(({ negated }) => !negated)
  let matched = !hasPositive
  let lastMatchedRule = hasPositive ? null : 'implicit-all'
  let excludedBy = null
  for (const item of parsed) {
    if (!matchesSinglePattern(path, item.pattern)) continue
    if (item.negated) {
      matched = false
      excludedBy = item.raw
    } else {
      matched = true
      lastMatchedRule = item.raw
      excludedBy = null
    }
  }
  return {
    matched,
    reason: matched ? `matched ${lastMatchedRule}` : excludedBy ? `excluded by ${excludedBy}` : 'path did not match',
  }
}

function matchesSinglePattern(path, pattern) {
  if (pattern.endsWith('/')) return path.startsWith(pattern) || path === pattern.slice(0, -1)
  if (!GLOB_META.test(pattern)) return path === pattern
  const target = pattern.includes('/') ? path : path.slice(path.lastIndexOf('/') + 1)
  return globRegex(pattern).test(target)
}

function normalize(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/')
}

function globRegex(pattern) {
  let source = '^'
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        i += 1
        if (pattern[i + 1] === '/') {
          i += 1
          source += '(?:[^/]+/)*'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }
    } else if (char === '?') {
      source += '[^/]'
    } else {
      source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    }
  }
  return new RegExp(`${source}$`)
}

import { isAbsolute, relative, resolve, sep } from 'node:path'
