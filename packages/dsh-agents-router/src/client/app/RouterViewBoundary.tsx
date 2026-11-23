import { createClientLogger } from '@kalex/dsh-logger-core';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RouterView, type RouterViewProps } from './RouterView.tsx';

interface RouterViewBoundaryState {
    readonly hasError: boolean;
}

const logger = createClientLogger();

/** Keeps an unexpected render failure visible instead of leaving the conversation view blank. */
export class RouterViewBoundary extends Component<RouterViewProps, RouterViewBoundaryState> {
    public override state: RouterViewBoundaryState = { hasError: false };

    public static getDerivedStateFromError(): RouterViewBoundaryState {
        return { hasError: true };
    }

    public override componentDidCatch(error: Error, info: ErrorInfo): void {
        logger.error('Agents Router conversation.view render failed', {
            event: 'ui_render',
            operation: 'conversation_view_boundary',
            errorCode: error.name,
            ...(info.componentStack ? { componentStack: info.componentStack } : {})
        });
    }

    public override render(): ReactNode {
        if (this.state.hasError) {
            const { t } = this.props;
            return (
                <main style={{ padding: 20 }}>
                    <h2>{t('renderFailureTitle')}</h2>
                    <p>{t('renderFailureDetails')}</p>
                </main>
            );
        }
        return <RouterView {...this.props} />;
    }
}
