// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodexRenderErrorBoundary } from '../src/client/features/settings/CodexRenderErrorBoundary.tsx';

function BrokenPanel(): ReactElement {
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

        expect(screen.getByText('Panel render failed').textContent).toBe('Panel render failed');
        await waitFor(() => expect(reportUiError).toHaveBeenCalledOnce());
        expect(reportUiError).toHaveBeenCalledWith({
            name: 'UIError',
            message: 'OpenAI Hub UI render failed',
            stack: '',
            componentStack: ''
        });
        expect(reportUiReady).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalledWith('[@kalex/dsh-openai-hub] Could not send UI diagnostic to Host logger');
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
