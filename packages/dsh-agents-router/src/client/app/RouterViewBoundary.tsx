import { Component, type ErrorInfo, type ReactNode } from 'react';
import { locales, resolveLocale } from '../locales/index.js';
import { getHostLocale } from '../utils/locale-context.js';
import { RouterView } from './RouterView.js';

interface RouterViewBoundaryProps {
    readonly sessionId: string;
}

interface RouterViewBoundaryState {
    readonly hasError: boolean;
}

/** Keeps an unexpected render failure visible instead of leaving the conversation view blank. */
export class RouterViewBoundary extends Component<RouterViewBoundaryProps, RouterViewBoundaryState> {
    public override state: RouterViewBoundaryState = { hasError: false };

    public static getDerivedStateFromError(): RouterViewBoundaryState {
        return { hasError: true };
    }

    public override componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('[Agents Router] conversation.view render failed', error, info.componentStack);
    }

    public override render(): ReactNode {
        if (this.state.hasError) {
            const locale = resolveLocale('auto', getHostLocale());
            const t = (key: string): string => (locales[locale] as Record<string, string>)[key] ?? key;
            return (
                <main role="alert" style={{ padding: 20, color: 'var(--dsh-ui-text)' }}>
                    <h2>{t('renderFailureTitle')}</h2>
                    <p>{t('renderFailureDetails')}</p>
                </main>
            );
        }
        return <RouterView sessionId={this.props.sessionId} />;
    }
}
