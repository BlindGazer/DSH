import { useState } from 'react'

export function RuleRow({ rule, t }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = rule.description.length > 100
  const paths = rule.appliesTo ?? []
  const shownPaths = expanded ? paths : paths.slice(0, 2)
  const pathText = rule.selected ? (shownPaths.join(', ') || 'always') : rule.reason
  return <div className="ar-rule"><div>
    <button type="button" className="ar-rule-title-clamped" title={rule.description} aria-expanded={expanded} disabled={!isLong && paths.length <= 2} onClick={() => setExpanded(!expanded)}><strong>{rule.description}</strong></button>
    <div className="ar-rule-meta"><code>{rule.source}</code><span>{rule.area}</span><span>{pathText}{rule.selected && paths.length > 2 && !expanded ? <button type="button" className="ar-more-badge" onClick={() => setExpanded(true)}>{t?.('morePaths')?.replace('{count}', String(paths.length - 2)) ?? `+${paths.length - 2} more`}</button> : null}</span></div>
  </div><span className={`ar-pill ${rule.selected ? 'ar-good' : ''}`}>{rule.characters.toLocaleString()} {t?.('chars') ?? 'chars'}</span></div>
}
