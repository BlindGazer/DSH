import { cleanNameList, parseNameList } from './name-list.js'

const CATEGORIES = ['events', 'workset', 'rulesDiff', 'preflight']

export function AuditProjectTab({ data, t, auditText, copyLog, clearLog, settings, updateCategory, updateProject, saveProject, notice, busy }) {
  return <section className="ar-panel ar-audit-grid">
    <article className="ar-card"><div className="ar-card-heading"><div><h2>{t('log')}</h2><code className="ar-muted">~/.dsh/agents-router/logs/&lt;project-hash&gt;-&lt;session-hash&gt;.log.md</code></div><div className="ar-actions"><button className="ar-btn" onClick={() => void copyLog()} disabled={!auditText}>{t('copyLog')}</button><button className="ar-btn danger" onClick={clearLog}>{t('deleteLog')}</button></div></div>
      <fieldset className="ar-categories"><legend>{t('logCategories')}</legend>{CATEGORIES.map((category) => <label key={category}><input type="checkbox" checked={settings.logCategories[category]} disabled={!data.globalSettings.globalLogging || !settings.projectLogging} onChange={(event) => updateCategory(category, event.target.checked)} />{t(category)}</label>)}</fieldset>
      <pre className="ar-log">{auditText || t('emptyLog')}</pre>
    </article>
    <article className="ar-card"><h2>{t('projectSettings')}</h2><form className="ar-form" onSubmit={saveProject}>
      <label>{t('instructionsRoot')}<input value={settings.instructionsRoot} onChange={(event) => updateProject('instructionsRoot', event.target.value)} /></label>
      <div className="ar-grid"><label>{t('rulesFolder')}<input value={settings.rulesFolder} onChange={(event) => updateProject('rulesFolder', event.target.value)} /></label><label>{t('skillsFolder')}<input value={settings.skillsFolder} onChange={(event) => updateProject('skillsFolder', event.target.value)} /></label></div>
      <div className="ar-grid"><label>{t('mainFile')}<input value={settings.mainFile} onChange={(event) => updateProject('mainFile', event.target.value)} /></label><label>{t('softBudget')}<input type="number" min="1" step="1" value={settings.tokenBudget} onChange={(event) => updateProject('tokenBudget', event.target.value)} /></label></div>
      <label className="ar-check"><input type="checkbox" checked={settings.projectLogging} disabled={!data.globalSettings.globalLogging} onChange={(event) => updateProject('projectLogging', event.target.checked)} />{t('projectLogging')}</label>
      <fieldset className="ar-categories ar-instruction-isolation"><legend>{t('instructionRedirection')}</legend>
        <p className="ar-muted">{t('instructionRedirectionHint')}</p>
        <label className="ar-check"><input type="checkbox" checked={settings.redirectRootInstructionFiles} onChange={(event) => updateProject('redirectRootInstructionFiles', event.target.checked)} />{t('redirectRootInstructionFiles')}</label>
        <label>{t('rootInstructionFileNames')}<textarea rows={3} value={settings.rootInstructionFileNames.join('\n')} onChange={(event) => updateProject('rootInstructionFileNames', parseNameList(event.target.value))} /></label>
        <label className="ar-check"><input type="checkbox" checked={settings.redirectInstructionDirectories} onChange={(event) => updateProject('redirectInstructionDirectories', event.target.checked)} />{t('redirectInstructionDirectories')}</label>
        <label>{t('instructionDirectoryNames')}<textarea rows={3} value={settings.instructionDirectoryNames.join('\n')} onChange={(event) => updateProject('instructionDirectoryNames', parseNameList(event.target.value))} /></label>
      </fieldset>
      <p className="ar-muted">{data.globalSettings.globalLogging ? t('loggingEnabled') : t('globalDisabled')}</p><button className="ar-btn" disabled={busy} type="submit">{t('saveProject')}</button>
    </form>{notice ? <p role="status" className="ar-success">{notice}</p> : null}</article>
  </section>
}
