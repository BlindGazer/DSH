// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodexRenderErrorBoundary } from '../src/client/features/settings/CodexRenderErrorBoundary.js';

function BrokenPanel() {
    throw new Error('render exploded');
}

function HealthyPanel() {
    return createElement('div', { 'data-testid': 'healthy-panel' }, 'ready');
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Codex render error boundary', () => {
    it('keeps a visible fallback and forwards render diagnostics to Host', async () => {
        const reportUiError = vi.fn(async () => true as const);
        const reportUiReady = vi.fn(async () => true as const);
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        render(
            createElement(
                CodexRenderErrorBoundary,
                {
                    fallbackText: 'Panel render failed',
                    componentId: 'openai-codex-auth-models',
                    onError: reportUiError,
                    onReady: reportUiReady
                },
                createElement(BrokenPanel)
            )
        );

        expect(screen.getByRole('alert').textContent).toBe('Panel render failed');
        await waitFor(() => expect(reportUiError).toHaveBeenCalledOnce());
        expect(reportUiError).toHaveBeenCalledWith(expect.objectContaining({ name: 'Error', message: 'render exploded' }));
        expect(reportUiReady).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalledWith('[dsh-openai-codex-auth] Could not send UI diagnostic to Host logger');
    });

    it('reports a component as ready only after its first successful mount', async () => {
        const reportUiError = vi.fn(async () => true as const);
        const reportUiReady = vi.fn(async () => true as const);
        render(
            createElement(
                CodexRenderErrorBoundary,
                {
                    fallbackText: 'Panel render failed',
                    componentId: 'openai-codex-auth-models',
                    onError: reportUiError,
                    onReady: reportUiReady
                },
                createElement(HealthyPanel)
            )
        );

        expect(screen.getByTestId('healthy-panel').textContent).toBe('ready');
        await waitFor(() => expect(reportUiReady).toHaveBeenCalledOnce());
        expect(reportUiReady).toHaveBeenCalledWith('openai-codex-auth-models');
    });
});
