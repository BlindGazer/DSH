// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { compile } from 'sass';
import { expect, it, vi } from 'vitest';
import { Popover } from '../src/components/Popover/Popover.tsx';
import { Tooltip } from '../src/components/Tooltip/Tooltip.tsx';

it('gives the dialog its own interactive DSH menu surface rather than tooltip styles', () => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(compile('packages/dsh-core/src/theme/coreStyles.module.scss').css.replaceAll(':global ', ''));
    const declarations = Array.from(sheet.cssRules)
        .filter(
            (rule): rule is CSSStyleRule =>
                rule instanceof CSSStyleRule && rule.selectorText.split(',').some(selector => selector.trim() === '.dsh-popover-content')
        )
        .map(rule => rule.style);
    expect(declarations.map(style => style.background)).toContain('var(--dsw-specific-menu, var(--dsh-ui-bg-modal))');
    expect(declarations.map(style => style.padding)).toContain('12px');
    expect(declarations.map(style => style.pointerEvents)).not.toContain('none');
});

it.each([0, 100])('opening a popover dismisses the hover tooltip with delay %i', async delayMs => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    host.dataset.theme = 'custom';
    document.body.append(host);
    const root = createRoot(host);
    const click = vi.fn();
    try {
        await act(async () =>
            root.render(
                <Tooltip content="Preview" triggerElement="span" delayMs={delayMs}>
                    <Popover
                        content={
                            <button type="button" onClick={click}>
                                Details
                            </button>
                        }>
                        Open
                    </Popover>
                </Tooltip>
            )
        );
        const trigger = host.querySelector('button');
        if (!trigger) throw new Error('Missing trigger');
        await act(async () => {
            trigger.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
        });
        expect(host.querySelector('.dsh-tooltip-content')?.textContent).toBe(delayMs ? undefined : 'Preview');
        await act(async () => trigger.click());
        await act(async () => {
            vi.advanceTimersByTime(delayMs);
        });
        expect(document.querySelector('.dsh-tooltip-content')).toBeNull();
        const panel = host.querySelector('[role="dialog"]');
        expect(panel?.parentElement).toBe(host);
        expect(panel?.hasAttribute('data-theme')).toBe(false);
        await act(async () => panel?.querySelector('button')?.click());
        expect(click).toHaveBeenCalledOnce();
        await act(async () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        expect(host.querySelector('[role="dialog"]')).toBeNull();
    } finally {
        await act(async () => root.unmount());
        host.remove();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    }
});
