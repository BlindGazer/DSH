// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { Notification } from '../src/components/Notification/Notification.tsx';

describe('Notification', () => {
    it('selects the diagnostic text when clipboard access fails', async () => {
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async () => {
                    throw new Error('denied');
                }
            }
        });
        try {
            await act(async () =>
                root.render(
                    <Notification
                        severity="error"
                        title="Failure"
                        message="Diagnostic"
                        onClose={() => undefined}
                        copyLabel="Copy"
                        closeLabel="Close"
                    />
                )
            );
            await act(async () => document.querySelector<HTMLButtonElement>('.dsh-notification button')?.click());
            expect(window.getSelection()?.toString()).toContain('Diagnostic');
        } finally {
            await act(async () => root.unmount());
            container.remove();
        }
    });
    it.each(['error', 'warning', 'info', 'success'] as const)('keeps %s text available for copying and explicit close', async severity => {
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);
        const close = vi.fn();
        const copy = vi.fn(async () => undefined);
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
        try {
            await act(async () =>
                root.render(
                    <Notification
                        severity={severity}
                        title="Notice"
                        message="Details"
                        onClose={close}
                        copyLabel="Copy"
                        closeLabel="Close"
                    />
                )
            );
            const notice = document.querySelector('.dsh-notification');
            expect(notice?.textContent).toContain('Details');
            expect(notice?.getAttribute('data-severity')).toBe(severity);
            const buttons = notice?.querySelectorAll('button');
            await act(async () => buttons?.item(0).click());
            expect(copy).toHaveBeenCalledWith('Notice\nDetails');
            expect(notice?.textContent).toContain('Details');
            await act(async () => buttons?.item(1).click());
            expect(close).toHaveBeenCalledOnce();
        } finally {
            await act(async () => root.unmount());
            container.remove();
        }
    });
});
