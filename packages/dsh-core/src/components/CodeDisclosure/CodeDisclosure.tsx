import type { ReactNode } from 'react';

export interface CodeDisclosureProps {
    readonly code: string;
    readonly children?: ReactNode;
    readonly label?: string;
}

export function CodeDisclosure({ code, children, label = 'Показать пример кода' }: CodeDisclosureProps) {
    return (
        <details className="dsh-code-disclosure">
            <summary>{label}</summary>
            {children}
            <pre>
                <code>{code}</code>
            </pre>
        </details>
    );
}
