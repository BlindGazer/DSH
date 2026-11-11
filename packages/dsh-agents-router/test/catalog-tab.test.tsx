import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogTab } from '../src/client/features/catalog/CatalogTab.js';
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS } from '../src/shared/constants/constants.js';
import type { RouterStateResponse } from '../src/shared/models/RouterModels.js';

const data: RouterStateResponse = {
    sessionId: 'catalog-session',
    rules: [
        {
            source: 'agents/active.md',
            sourcePath: 'agents/active.md',
            filePath: '/repo/agents/active.md',
            area: 'global',
            enabled: true,
            description: 'Active description',
            content: 'Active rule body',
            appliesTo: [],
            selected: true,
            reason: 'always'
        },
        {
            source: 'agents/skipped.md',
            sourcePath: 'agents/skipped.md',
            filePath: '/repo/agents/skipped.md',
            area: 'global',
            enabled: true,
            description: 'Skipped description',
            content: 'Skipped rule body',
            appliesTo: [],
            selected: false,
            reason: 'unmatched'
        }
    ],
    skills: [],
    settings: DEFAULT_PROJECT_SETTINGS,
    globalSettings: DEFAULT_GLOBAL_SETTINGS,
    metrics: { estimatedTokens: 0, tokenBudget: 0, lastUpdated: 0 },
    diagnostics: [],
    areas: [],
    coverage: []
};

describe('catalog tab', () => {
    it('shows total counts on status filters and provides a name/description search field', () => {
        const markup = renderToStaticMarkup(
            <CatalogTab data={data} t={key => key} filter="all" setFilter={() => {}} openFile={() => Promise.resolve()} />
        );

        expect(markup).toContain('all (2)');
        expect(markup).toContain('active (1)');
        expect(markup).toContain('skipped (1)');
        expect(markup).toContain('aria-label="filterRules"');
        expect(markup).toContain('placeholder="filterRules"');
    });
});
