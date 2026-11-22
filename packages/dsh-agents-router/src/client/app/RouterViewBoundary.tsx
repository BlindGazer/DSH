import { createClientLogger } from '@kalex/dsh-logger-core';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { locales, resolveLocale } from '../locales/index.ts';
import { getHostLocale } from '../utils/locale-context.ts';
import { RouterView } from './RouterView.tsx';

interface RouterViewBoundaryProps {
    readonly sessionId: string;
}

interface RouterViewBoundaryState {
    readonly hasError: boolean;
}

const logger = createClientLogger();

/** Keeps an unexpected render failure visible instead of leaving the conversation view blank. */
export class RouterViewBoundary extends Component<RouterViewBoundaryProps, RouterViewBoundaryState> {
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
            const locale = resolveLocale('auto', getHostLocale());
            const t = (key: string): string => (locales[locale] as Record<string, string>)[key] ?? key;
            return (
                <main style={{ padding: 20 }}>
                    <h2>{t('renderFailureTitle')}</h2>
                    <p>{t('renderFailureDetails')}</p>
                </main>
            );
        }
        return <RouterView sessionId={this.props.sessionId} />;
    }
}
