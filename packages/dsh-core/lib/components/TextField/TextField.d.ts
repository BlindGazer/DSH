import type { InputHTMLAttributes } from 'react';
export interface TextFieldProps {
    readonly value: string;
    readonly size?: 'small' | 'standard';
    readonly onChange: (value: string) => void;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly type?: InputHTMLAttributes<HTMLInputElement>['type'];
    readonly className?: string;
    readonly id?: string;
    readonly maxLength?: number;
    readonly autoComplete?: string;
    readonly spellCheck?: boolean;
    /** Передавайте свойство и без ошибки, чтобы сохранить DOM поля между проверками. */
    readonly error?: string | undefined;
}
export declare function TextField(props: TextFieldProps): import("react").JSX.Element;
