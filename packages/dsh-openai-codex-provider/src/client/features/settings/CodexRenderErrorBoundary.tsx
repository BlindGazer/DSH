import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import type { UiComponentId, UiRenderError } from '../../../shared/remote.js';
import { sanitizeUiRenderError } from '../../../shared/remote.js';

interface CodexRenderErrorBoundaryProps {
    readonly children?: ReactNode;
    readonly fallbackText: string;
    readonly componentId: UiComponentId;
    readonly onError: (error: UiRenderError) => Promise<true>;
    readonly onReady: (componentId: UiComponentId) => Promise<true>;
}

interface CodexRenderErrorBoundaryState {
    readonly hasError: boolean;
}

export class CodexRenderErrorBoundary extends Component<CodexRenderErrorBoundaryProps, CodexRenderErrorBoundaryState> {
    override state: CodexRenderErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): CodexRenderErrorBoundaryState {
        return { hasError: true };
    }

    override componentDidMount(): void {
        if (this.state.hasError) return;
        void this.props.onReady(this.props.componentId).catch(() => {
            console.error('[@kalex/dsh-openai-codex-provider] Could not send UI readiness to Host logger');
        });
    }

    override componentDidCatch(error: Error, info: ErrorInfo): void {
        const diagnostic = sanitizeUiRenderError({
            name: error.name,
            message: error.message,
            stack: error.stack ?? '',
            componentStack: info.componentStack ?? ''
        });
        console.error('[@kalex/dsh-openai-codex-provider] UI render error', diagnostic);
        void this.props
            .onError(
                sanitizeUiRenderError({
                    name: error.name,
                    message: error.message,
                    stack: error.stack ?? '',
                    componentStack: info.componentStack ?? ''
                })
            )
            .catch(() => {
                console.error('[@kalex/dsh-openai-codex-provider] Could not send UI diagnostic to Host logger');
            });
    }

    override render(): ReactNode {
        return this.state.hasError ? <p role="alert">{this.props.fallbackText}</p> : this.props.children;
    }
}
