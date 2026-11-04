import { computeRuleMetrics } from './metrics.js'

export function shouldSkipBatchAudit(state, batchKey, addedPaths, missing, batchError) {
  return addedPaths.length === 0 && missing.length === 0 && !batchError && state.lastLoggedBatchKey === batchKey
}

export async function recordAudit(state, store, { event, workset, preflight, diagnostics, batchKey } = {}) {
  const previous = state.auditRules ?? new Map()
  const current = new Map(state.rules.map((rule) => [rule.sourcePath, rule]))
  const added = [...current].filter(([source]) => !previous.has(source))
  const evicted = [...previous].filter(([source]) => !current.has(source))
  const revised = [...current].filter(([source, rule]) => previous.has(source) && previous.get(source).hash !== rule.hash)
  const unchanged = [...current].filter(([source, rule]) => previous.has(source) && previous.get(source).hash === rule.hash)
  const knownDiagnostics = state.lastLoggedDiagKeys ?? new Set()
  const newDiagnostics = (diagnostics ?? []).filter((item) => !knownDiagnostics.has(diagnosticKey(item)))
  for (const item of diagnostics ?? []) knownDiagnostics.add(diagnosticKey(item))

  if (event === 'prompt_assemble' && !added.length && !evicted.length && !revised.length && !newDiagnostics.length) return false

  const categories = state.settings.logCategories
  const lines = []
  if (categories.events && event) lines.push(`event: ${event}`)
  if (categories.workset && workset) lines.push(`workset: ${workset}`)
  if (categories.rulesDiff) {
    const metrics = computeRuleMetrics(state)
    lines.push('rules_diff:', `  active: ${current.size} | chars: ${metrics.characters} | est_tokens: ${metrics.estTokens}`)
    for (const [source, rule] of added) {
      const matchReason = rule.appliesTo.includes('always') ? 'always' : `area=${rule.area}; rule=${rule.path.join(' OR ') || 'unrestricted'}; file=${rule.appliesTo.join(', ')}`
      lines.push(`  + ${source} @${rule.hash.slice(0, 8)} [${matchReason}] (${rule.content.length}c)`)
    }
    if (evicted.length) lines.push(`  evicted: ${evicted.map(([source]) => `${source} (no longer selected)`).join(', ')}`)
    if (revised.length) lines.push(`  rev_changed: ${revised.map(([source, rule]) => `${source} old=${previous.get(source).hash.slice(0, 8)} new=${rule.hash.slice(0, 8)} (source revision changed)`).join(', ')}`)
    const unchangedAlways = unchanged.filter(([, rule]) => rule.appliesTo.includes('always')).length
    const unchangedMatched = unchanged.length - unchangedAlways
    lines.push(`  unchanged: ${unchanged.length}${unchanged.length ? ` (${unchangedAlways} always, ${unchangedMatched} matched)` : ''} | evicted: ${evicted.length} | rev_changed: ${revised.length}`)
  }
  if (categories.preflight && (preflight || newDiagnostics.length)) {
    if (preflight) lines.push(`diagnostics: ${preflight}`)
    if (newDiagnostics.length) lines.push(`diagnostics: warnings: ${newDiagnostics.length} [${[...new Set(newDiagnostics.map((item) => item.code))].join(', ')}]`)
  }
  if (!lines.length) return false
  try {
    const logged = await store.appendAuditLog(state.projectRoot, state.sessionId, lines.join('\n'))
    if (!logged) return false
    state.auditRules = current
    state.lastLoggedDiagKeys = knownDiagnostics
    if (batchKey && event?.startsWith('file_preflight')) state.lastLoggedBatchKey = batchKey
    return true
  } catch (error) {
    state.auditWarning = `audit log could not be written: ${error.message}`
    return false
  }
}

function diagnosticKey(item) {
  return item.key ?? `${item.code}:${item.path}:${item.message}`
}
