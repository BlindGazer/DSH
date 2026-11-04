export function KpiStrip({ data, t, lastPoint, percent }) {
  return <section className="ar-kpis">
    <Kpi title={t('rules')} value={`${data.metrics.rules.count} / ${data.rules.length}`} detail={`${data.metrics.rules.characters.toLocaleString()} ${t('chars')}`} />
    <Kpi title={t('workset')} value={`${data.activePaths.length} ${t('paths')}`} detail={data.status === 'idle' ? t('idleState') : t('running')} />
    <Kpi title={t('skills')} value={`${data.metrics.skillCatalog.count} / ${data.metrics.loadedSkills.count}`} detail={`${data.metrics.skillCatalog.characters.toLocaleString()} ${t('chars')}`} />
    <Kpi title={t('memoryBudget')} value={`${lastPoint.toLocaleString()} / ${data.metrics.tokenBudget.toLocaleString()}`} detail={`${percent.toFixed(1)}%`} tone={percent > 100 ? 'danger' : percent >= 70 ? 'warn' : 'success'} />
  </section>
}

export function Kpi({ title, value, detail, tone }) {
  return <article className="ar-card ar-kpi"><div className="ar-muted">{title}</div><div className={`ar-kpi-value ${tone ? `ar-${tone}` : ''}`}>{value}</div><div className="ar-muted">{detail}</div></article>
}
