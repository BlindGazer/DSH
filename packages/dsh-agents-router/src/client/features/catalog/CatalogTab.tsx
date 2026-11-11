import type React from 'react';
import { useState } from 'react';
import type { DiscoveredRuleWithState, RouterStateResponse } from '../../../shared/models/RouterModels.js';
import { RuleRow } from '../../components/common/RuleRow.js';

export interface CatalogTabProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    filter: 'all' | 'active' | 'skipped';
    setFilter: (filter: 'all' | 'active' | 'skipped') => void;
    openFile: (filePath: string) => Promise<void>;
}

export function CatalogTab({ data, t, filter, setFilter, openFile }: CatalogTabProps): React.JSX.Element {
    const [search, setSearch] = useState('');
    const counts = {
        all: data.rules.length,
        active: data.rules.filter(rule => rule.selected).length,
        skipped: data.rules.filter(rule => !rule.selected).length
    };
    const query = search.trim().toLowerCase();
    const filteredRules = data.rules.filter(rule => {
        const matchesStatus = filter === 'all' || (filter === 'active' ? rule.selected : !rule.selected);
        if (!matchesStatus || !query) return matchesStatus;
        const fileName = rule.sourcePath.split(/[\\/]/).at(-1) ?? rule.sourcePath;
        return fileName.toLowerCase().includes(query) || (rule.description?.toLowerCase().includes(query) ?? false);
    });

    return (
        <section className="ar-panel" role="tabpanel">
            <article className="ar-card">
                <div className="ar-card-heading ar-catalog-heading">
                    <h2>
                        {t('allRules')} <span className="ar-rules-total">{data.rules.length}</span>
                    </h2>
                    <div className="ar-catalog-controls">
                        <div className="ar-rule-search">
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M21 21l-4.35-4.35M16.65 10.85a5.8 5.8 0 11-11.6 0 5.8 5.8 0 0111.6 0z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <input
                                className="ar-rule-filter"
                                type="text"
                                aria-label={t('filterRules')}
                                placeholder={t('filterRules')}
                                value={search}
                                onChange={event => setSearch(event.currentTarget.value)}
                            />
                            {search ? (
                                <button
                                    className="ar-rule-search-clear"
                                    type="button"
                                    aria-label={t('clearFilter')}
                                    title={t('clearFilter')}
                                    onClick={() => setSearch('')}>
                                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            ) : null}
                        </div>
                        <fieldset className="ar-segments">
                            <legend className="ar-sr-only">{t('allRules')}</legend>
                            {(['all', 'active', 'skipped'] as const).map(value => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`ar-segment-btn${filter === value ? ' selected' : ''}`}
                                    aria-pressed={filter === value}
                                    onClick={() => setFilter(value)}>
                                    {t(value)} ({counts[value]})
                                </button>
                            ))}
                        </fieldset>
                    </div>
                </div>
                {filteredRules.length ? (
                    <div className="ar-list">
                        {filteredRules.map((rule: DiscoveredRuleWithState) => (
                            <RuleRow key={rule.source} rule={rule} sessionId={data.sessionId} openFile={openFile} t={t} />
                        ))}
                    </div>
                ) : (
                    <p className="ar-muted">{data.rules.length ? t('noMatchingRules') : t('noRules')}</p>
                )}
            </article>
            <div className="ar-grid">
                <article className="ar-card">
                    <details>
                        <summary>
                            {t('areas')} ({data.areas.length})
                        </summary>
                        <ul className="ar-list">
                            {data.areas.map((area: { name: string; path: readonly string[]; reason: string }) => (
                                <li key={area.name}>
                                    <code>{area.name}</code>
                                    <span>
                                        {Array.from(area.path).join(' OR ')}; {area.reason}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </details>
                </article>
                <article className="ar-card">
                    <details>
                        <summary>
                            {t('registeredSkills')} ({data.skills.length})
                        </summary>
                        <ul className="ar-list">
                            {data.skills.map(skill => (
                                <li key={skill.name}>
                                    <code>{skill.invocation?.userInvocable ? `/${skill.name}` : skill.name}</code>
                                    <span>
                                        {skill.description}
                                        <small>{skill.sourcePath}</small>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {!data.skills.length ? <p className="ar-muted">{t('noSkills')}</p> : null}
                    </details>
                </article>
            </div>
        </section>
    );
}
