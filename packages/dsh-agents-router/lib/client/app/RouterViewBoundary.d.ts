import { Component, type ErrorInfo, type ReactNode } from 'react';
interface RouterViewBoundaryProps {
    readonly sessionId: string;
}
interface RouterViewBoundaryState {
    readonly hasError: boolean;
}
/** Keeps an unexpected render failure visible instead of leaving the conversation view blank. */
export declare class RouterViewBoundary extends Component<RouterViewBoundaryProps, RouterViewBoundaryState> {
    state: RouterViewBoundaryState;
    static getDerivedStateFromError(): RouterViewBoundaryState;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    render(): ReactNode;
}
export {};
