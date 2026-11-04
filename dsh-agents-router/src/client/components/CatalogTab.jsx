import { RuleRow } from './RuleRow.jsx'

export function CatalogTab({ data, t, filter, setFilter }) {
  return <section className="ar-panel" role="tabpanel">
    <article className="ar-card"><div className="ar-card-heading"><h2>{t('allRules')} ({data.rules.length})</h2><div className="ar-segments">{['all', 'active', 'skipped'].map((value) => <button className={`ar-segment-btn${filter === value ? ' selected' : ''}`} key={value} onClick={() => setFilter(value)}>{t(value)}</button>)}</div></div>
      <div className="ar-list">{data.rules.filter((rule) => filter === 'all' || (filter === 'active' ? rule.selected : !rule.selected)).map((rule) => <RuleRow key={rule.source} rule={rule} t={t} />)}</div>
      {!data.rules.length ? <p className="ar-muted">{t('noRules')}</p> : null}
    </article>
    <div className="ar-grid">
      <article className="ar-card"><details><summary>{t('areas')} ({data.areas.length})</summary><ul className="ar-list">{data.areas.map((area) => <li key={area.name}><code>{area.name}</code><span>{[].concat(area.path).join(' OR ')}; {area.reason}</span></li>)}</ul></details></article>
      <article className="ar-card"><details><summary>{t('registeredSkills')} ({data.skills.length})</summary><ul className="ar-list">{data.skills.map((skill) => <li key={skill.name}><code>{skill.invocation.userInvocable ? `/${skill.name}` : skill.name}</code><span>{skill.description}<small>{skill.sourcePath}</small></span></li>)}</ul>{!data.skills.length ? <p className="ar-muted">{t('noSkills')}</p> : null}</details></article>
    </div>
  </section>
}
