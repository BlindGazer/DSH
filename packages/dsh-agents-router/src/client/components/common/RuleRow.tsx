import type React from 'react';
import { useState } from 'react';
import type { DiscoveredRuleWithState } from '../../../shared/models/RouterModels.js';

export interface RuleRowProps {
    rule: DiscoveredRuleWithState;
    sessionId: string;
    openFile: (filePath: string) => Promise<void>;
    t?: (key: string) => string;
}

export function RuleRow({ rule, sessionId, openFile, t }: RuleRowProps): React.JSX.Element {
    const [showAllConditions, setShowAllConditions] = useState(false);
    const sourceName = rule.sourcePath.split(/[\\/]/).at(-1) ?? rule.sourcePath;
    const sourceDirectory = rule.sourcePath.slice(0, -sourceName.length);
    const fileUrl = `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${rule.sourcePath
        .split(/[\\/]/)
        .map(encodeURIComponent)
        .join('/')}`;
    const description = rule.description ?? '';
    const hasDescription = description.trim().length > 0;
    const conditions = [...new Set(rule.appliesTo.length ? rule.appliesTo : [rule.reason])];
    const visibleConditions = showAllConditions ? conditions : conditions.slice(0, 1);

    return (
        <article className="ar-rule">
            <details className="ar-rule-details">
                <summary className="ar-rule-header">
                    <svg className="ar-rule-chevron" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="ar-rule-heading">
                        <span className="ar-rule-path-title" title={rule.sourcePath}>
                            <span className="ar-rule-directory">{sourceDirectory}</span>
                            <strong className="ar-rule-title">{sourceName}</strong>
                        </span>
                        {hasDescription ? (
                            <span className="ar-rule-description-preview" title={description}>
                                | {description}
                            </span>
                        ) : null}
                    </span>
                    <span className="ar-rule-badges">
                        <span className="ar-rule-scope">{rule.area}</span>
                        <span className={`ar-pill ar-rule-characters ${rule.selected ? 'ar-good' : ''}`}>
                            {(rule.characters ?? description.length).toLocaleString()} {t?.('chars') ?? 'chars'}
                        </span>
                    </span>
                </summary>
                <div className="ar-rule-content">
                    <div className="ar-rule-path">
                        <span className="ar-rule-path-label">{t?.('path') ?? 'Path'}:</span>
                        <a
                            href={fileUrl}
                            title={rule.filePath}
                            onClick={event => {
                                event.preventDefault();
                                void openFile(rule.filePath);
                            }}>
                            {rule.sourcePath}
                        </a>
                        <button
                            className="ar-rule-copy"
                            type="button"
                            aria-label={t?.('copyPath') ?? 'Copy path'}
                            title={t?.('copyPath') ?? 'Copy path'}
                            onClick={() => void navigator.clipboard?.writeText(rule.filePath).catch(() => undefined)}>
                            {t?.('copyPath') ?? 'Copy path'}
                        </button>
                    </div>
                    {hasDescription ? <pre>{description}</pre> : null}
                </div>
            </details>
            <footer className="ar-rule-footer">
                <span className="ar-rule-footer-label">{t?.('appliesTo') ?? 'Applies to'}:</span>
                <div className="ar-rule-conditions">
                    {visibleConditions.map(condition => (
                        <code key={condition}>{condition}</code>
                    ))}
                    {conditions.length > 1 ? (
                        <button
                            className="ar-rule-more"
                            type="button"
                            aria-expanded={showAllConditions}
                            onClick={() => setShowAllConditions(!showAllConditions)}>
                            {showAllConditions
                                ? (t?.('less') ?? 'Less')
                                : (t?.('morePaths')?.replace('{count}', String(conditions.length - 1)) ?? `+${conditions.length - 1} more`)}
                        </button>
                    ) : null}
                </div>
            </footer>
        </article>
    );
}
