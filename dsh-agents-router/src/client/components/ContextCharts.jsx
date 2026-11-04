export function ContextBar({ data, t }) {
  const values = [
    [t('rulesLabel'), data.metrics.rules.characters, 'ar-blue'],
    [t('areasLabel'), data.metrics.areaCatalog.characters, 'ar-violet'],
    [t('skillCatalogMetric'), data.metrics.skillCatalog.characters, 'ar-amber'],
    [t('invokedSkills'), data.metrics.loadedSkills.characters, 'ar-green'],
  ]
  const total = values.reduce((sum, item) => sum + item[1], 0)
  return <><div className="ar-stack">{values.map(([name, count, color]) => <span key={name} className={color} style={{ width: `${total ? (count / total) * 100 : 0}%` }} title={`${name}: ${count}`} />)}</div><div className="ar-grid ar-legend">{values.map(([name, count, color]) => <div className="ar-subcard" key={name}><span className={`ar-dot ${color}`} />{name}<strong>{count.toLocaleString()} {t('chars')}</strong></div>)}</div></>
}

export function TokenChart({ points, budget }) {
  if (!points.length) return <p className="ar-muted">Loading...</p>
  const width = 600
  const height = 120
  const max = Math.max(budget * 1.15, ...points.map((point) => point.tokens), 1)
  const coords = points.map((point, index) => ({
    x: points.length === 1 ? width / 2 : 12 + (index / (points.length - 1)) * (width - 24),
    y: height - 10 - (Math.min(max, point.tokens) / max) * (height - 24),
  }))
  const line = coords.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')
  const area = `${line} L${coords.at(-1).x},${height} L${coords[0].x},${height} Z`
  const budgetY = height - 10 - (budget / max) * (height - 24)
  return <div className="ar-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Token usage history"><path d={area} className="ar-chart-area" /><path d={line} className="ar-chart-line" /><line x1="0" x2={width} y1={budgetY} y2={budgetY} className="ar-chart-budget" />{coords.map((point, index) => <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="3" className="ar-chart-point" />)}</svg><div className="ar-chart-labels"><span>{points[0].label}</span><span>{points.at(-1).label}</span></div></div>
}
