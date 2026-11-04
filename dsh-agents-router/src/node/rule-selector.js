import { explainPathMatch, matchesPath } from './path-match.js'

/** Return managed rules matching active paths; unfiltered global rules are always included. */
export function selectRules(snapshot, activePaths = []) {
  const paths = [...new Map(activePaths.map(normalizePath).filter(Boolean).map((value) => [value.toLowerCase(), value])).values()].sort(compare)
  const selected = new Map()
  for (const rule of snapshot.rules) {
    if (!rule.enabled) continue
    if (rule.area === 'global') {
      const appliesTo = rule.path.length === 0 ? ['always'] : paths.filter((candidate) => matchesPath(candidate, rule.path))
      if (appliesTo.length) selected.set(rule.id, { ...rule, appliesTo })
      continue
    }
    const area = snapshot.areas.get(rule.area)
    if (!area || !area.available || !area.enabled || !parentsAvailable(area, snapshot.areas)) continue
    const appliesTo = paths.filter((candidate) => areaMatches(snapshot, area, candidate) && matchesPath(candidate, rule.path))
    if (appliesTo.length) selected.set(rule.id, { ...rule, appliesTo })
  }
  return [...selected.values()]
}

export function renderRules(rules) {
  return rules.map((rule) => {
    const applies = rule.appliesTo.includes('always') ? 'always' : rule.appliesTo.map((file) => `\`${file}\``).join(', ')
    return `## ${rule.description || rule.sourcePath.split('/').at(-1)}\nSource: ${rule.sourcePath}${rule.area === 'global' ? '' : ` (area ${rule.area})`}\nRevision: ${rule.hash}\nApplies to: ${applies}\n\n${rule.content.trim()}`
  }).join('\n\n---\n\n')
}

/** Explain whether a project-relative file would activate each configured rule. */
export function diagnosePath(snapshot, filePath) {
  const candidate = normalizePath(filePath)
  const rows = []
  for (const rule of snapshot.rules) {
    if (!rule.enabled) {
      rows.push({ rule, applies: false, reason: 'disabled' })
      continue
    }
    if (rule.area === 'global') {
      const pathMatch = explainPathMatch(candidate, rule.path)
      rows.push({ rule, applies: pathMatch.matched, reason: rule.path.length === 0 ? 'always' : explainFilterReason(pathMatch, 'rule') })
      continue
    }
    const area = snapshot.areas.get(rule.area)
    if (!area || !area.available || !area.enabled || !parentsAvailable(area, snapshot.areas)) {
      rows.push({ rule, applies: false, reason: 'area or parent is unavailable/disabled' })
      continue
    }
    const areaResult = explainAreaPathMatch(snapshot, area, candidate)
    const ruleResult = explainPathMatch(candidate, rule.path)
    rows.push({
      rule,
      applies: areaResult.matched && ruleResult.matched,
      reason: !areaResult.matched ? areaResult.reason : !ruleResult.matched ? explainFilterReason(ruleResult, 'rule') : 'area and rule paths matched',
    })
  }
  return rows
}

export function renderAreas(snapshot) {
  const rows = [...snapshot.areas].sort(([a], [b]) => a.localeCompare(b)).filter(([, area]) => {
    let current = area
    while (current) {
      if (!current.enabled || !current.available) return false
      if (!current.parent) return true
      current = snapshot.areas.get(current.parent)
    }
    return false
  }).map(([name, area]) => {
    const paths = Array.isArray(area.path) ? area.path : [area.path]
    const keywords = area.keywords?.length ? `; keywords: ${area.keywords.join(', ')}` : ''
    return `- ${name}: ${paths.join(' OR ')}${keywords}`
  })
  return rows.length ? `## Project areas (search hints only; they do not activate rules)\n${rows.join('\n')}` : ''
}

export function parentsAvailable(area, areas) {
  let parent = area.parent
  while (parent) {
    const item = areas.get(parent)
    if (!item || !item.enabled || item.available === false) return false
    parent = item.parent
  }
  return true
}

function areaMatches(snapshot, area, candidate) {
  return explainAreaPathMatch(snapshot, area, candidate).matched
}

function explainAreaPathMatch(snapshot, area, candidate) {
  let current = area
  while (current) {
    if (!current.enabled || !current.available) return { matched: false, reason: 'area or parent is unavailable/disabled' }
    const result = explainPathMatch(candidate, current.path)
    if (!result.matched) return { matched: false, reason: explainFilterReason(result, 'area') }
    if (!current.parent) return { matched: true, reason: 'area path matched' }
    current = snapshot.areas.get(current.parent)
  }
  return { matched: false, reason: 'area or parent is unavailable/disabled' }
}

function explainFilterReason(result, kind) {
  if (result.reason.startsWith('excluded by ')) return `excluded by ${kind} pattern ${result.reason.slice('excluded by '.length)}`
  return `${kind} path did not match`
}

function normalizePath(value) {
  if (typeof value !== 'string') return ''
  return value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/').replace(/^\//, '')
}

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
