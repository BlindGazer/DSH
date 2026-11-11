import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RuleRow } from '../src/client/components/common/RuleRow.js';
import type { DiscoveredRuleWithState } from '../src/shared/models/RouterModels.js';

describe('rule row', () => {
    it('renders the rule path, description, and applies-to footer in their intended sections', () => {
        const rule: DiscoveredRuleWithState = {
            source: 'agents/front/rules/design-system.md',
            sourcePath: 'agents/front/rules/design-system.md',
            filePath: 'D:\\repo with spaces\\agents\\front\\rules\\design-system.md',
            area: 'front',
            enabled: true,
            description: 'Design system requirements',
            content: 'Rule body',
            appliesTo: ['packages/example/src/client/Widget.tsx'],
            selected: true,
            reason: 'always'
        };

        const markup = renderToStaticMarkup(
            <RuleRow rule={rule} sessionId="session/id" openFile={() => Promise.resolve()} t={key => key} />
        );

        expect(markup).toContain('<svg class="ar-rule-chevron"');
        expect(markup).toContain('class="ar-rule-path-title" title="agents/front/rules/design-system.md"');
        expect(markup).toContain(
            '<span class="ar-rule-directory">agents/front/rules/</span><strong class="ar-rule-title">design-system.md</strong>'
        );
        expect(markup).toContain(
            '<span class="ar-rule-description-preview" title="Design system requirements">| Design system requirements</span>'
        );
        expect(markup).toContain('href="dsh-resource://file/session/session%2Fid/agents/front/rules/design-system.md"');
        expect(markup).toContain('aria-label="copyPath"');
        expect(markup).toContain('title="D:\\repo with spaces\\agents\\front\\rules\\design-system.md"');
        expect(markup).toContain('<span class="ar-rule-path-label">path:</span>');
        expect(markup).toContain('<pre>Design system requirements</pre>');
        expect(markup).toContain('appliesTo:</span><div class="ar-rule-conditions"><code>packages/example/src/client/Widget.tsx</code>');
        expect(markup.indexOf('<a href=')).toBeLessThan(markup.indexOf('<pre>'));
        expect(markup.indexOf('<pre>')).toBeLessThan(markup.indexOf('<footer'));

        const { description, ...ruleWithoutDescription } = rule;
        expect(description).toBe('Design system requirements');
        const markupWithoutDescription = renderToStaticMarkup(
            <RuleRow rule={ruleWithoutDescription} sessionId="session/id" openFile={() => Promise.resolve()} t={key => key} />
        );
        expect(markupWithoutDescription).not.toContain('<pre');
        expect(markupWithoutDescription).not.toContain('ar-rule-description-preview');
    });
});
