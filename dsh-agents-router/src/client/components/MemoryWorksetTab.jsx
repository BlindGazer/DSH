import { ContextBar, TokenChart } from './ContextCharts.jsx'
import { RuleRow } from './RuleRow.jsx'

export function MemoryWorksetTab({ data, t, points, path, setPath, addPath, busy, run, post, activeRules, matched, always }) {
  return <section className="ar-panel" role="tabpanel">
    <div className="ar-grid ar-grid-wide">
      <article className="ar-card"><div className="ar-card-heading"><h2>{t('contextStructure')}</h2><span className="ar-muted">{t('currentSet')}: {data.metrics.uniqueCurrentSetCharacters.toLocaleString()} {t('chars')}</span></div>
        <ContextBar data={data} t={t} />
        <div className="ar-footnote">{t('visibleHistory')}: {data.metrics.visibleKnownPluginCharacters.toLocaleString()} {t('chars')}</div>
      </article>
      <article className="ar-card"><div className="ar-card-heading"><h2>{t('tokenTrend')}</h2><span className="ar-pill">{t('budget')}: {data.metrics.tokenBudget.toLocaleString()}</span></div>
        <TokenChart points={points} budget={data.metrics.tokenBudget} />
      </article>
    </div>
    <div className="ar-grid ar-grid-workset">
      <article className="ar-card"><h2>{t('workset')}</h2>
        <form className="ar-inline" onSubmit={addPath}><input aria-label={t('addPath')} placeholder="src/front/components/File.ts" value={path} onChange={(event) => setPath(event.target.value)} /><button className="ar-btn" disabled={busy || !data.canReset}>{t('add')}</button></form>
        {data.activePaths.length ? <ul className="ar-list">{data.activePaths.map((item) => <li className="ar-workset-item" key={item}><code className="ar-workset-path">{item}</code><button className="ar-btn ar-btn-sm" disabled={busy || !data.canReset} onClick={() => void run(() => post('workset', { action: 'release', path: item }))}>{t('release')}</button></li>)}</ul> : <p className="ar-muted">{t('noPaths')}</p>}
      </article>
      <article className="ar-card"><h2>{t('matchedRules')} ({activeRules.length})</h2>
        <div className="ar-list">{matched.map((rule) => <RuleRow key={rule.source} rule={rule} t={t} />)}</div>
        <details className="ar-subcard"><summary>{t('alwaysRules')} ({always.length})</summary><div className="ar-list">{always.map((rule) => <RuleRow key={rule.source} rule={rule} t={t} />)}</div></details>
      </article>
    </div>
  </section>
}
