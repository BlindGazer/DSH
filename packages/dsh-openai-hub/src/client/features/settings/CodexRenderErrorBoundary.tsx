import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import type { UiComponentId, UiRenderError } from '../../../shared/remote.ts';
import { sanitizeUiRenderError } from '../../../shared/remote.ts';

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
            void 0;
        });
    }

    override componentDidCatch(error: Error, info: ErrorInfo): void {
        const diagnostic = sanitizeUiRenderError({
            name: error.name,
            message: error.message,
            stack: error.stack ?? '',
            componentStack: info.componentStack ?? ''
        });
        void diagnostic;
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
                void 0;
            });
    }

    override render(): ReactNode {
        return this.state.hasError ? <p>{this.props.fallbackText}</p> : this.props.children;
    }
}
