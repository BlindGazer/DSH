import { renderToStaticMarkup } from 'react-dom/server';
import { assert, test } from 'vitest';
import { AuditProjectTab } from '../src/client/features/audit-project/AuditProjectTab.js';
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS } from '../src/shared/constants/constants.js';
import type { RouterStateResponse } from '../src/shared/models/RouterModels.js';

const data: RouterStateResponse = {
    sessionId: 'project-settings-session',
    projectRoot: 'C:/work/project',
    resolvedInstructionsRoot: 'C:/work/project/.agents',
    rules: [
        {
            source: '.cursor/rules/typescript.mdc',
            sourcePath: '.cursor/rules/typescript.mdc',
            filePath: 'C:/work/project/.cursor/rules/typescript.mdc',
            area: 'global',
            enabled: true,
            selected: true,
            appliesTo: ['src/app.ts'],
            reason: 'matches active workset'
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

test('shows discovery mode and detected project sources for verification', () => {
    const markup = renderToStaticMarkup(
        <AuditProjectTab
            data={data}
            t={key => key}
            auditText=""
            copyLog={async () => {}}
            clearLog={() => {}}
            settings={DEFAULT_PROJECT_SETTINGS}
            updateCategory={() => {}}
            updateProject={() => {}}
            saveProject={async event => event.preventDefault()}
            notice=""
            busy={false}
        />
    );

    assert.match(markup, /C:\/work\/project/);
    assert.match(markup, /resolvedInstructionsRoot:/);
    assert.match(markup, /C:\/work\/project\/\.agents/);
    assert.match(markup, /discoveredRules: 1/);
    assert.match(markup, /activeRules: 1/);
    assert.match(markup, /discoveryMode/);
    assert.match(markup, /value="merge"/);
    assert.match(markup, /discoveryStrict/);
    assert.match(markup, /discoveryFallback/);
});
