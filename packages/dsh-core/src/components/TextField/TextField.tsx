import type { ChangeEvent, InputHTMLAttributes } from 'react';

import { cx } from '../../utils/classNames.ts';
import { FieldError } from '../FieldError/FieldError.tsx';

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

export function TextField(props: TextFieldProps) {
    const {
        value,
        size = 'standard',
        onChange,
        placeholder,
        disabled = false,
        type = 'text',
        className,
        id,
        maxLength,
        autoComplete,
        spellCheck,
        error
    } = props;
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => onChange(event.currentTarget.value);
    const input = (
        <input
            type={type}
            className={cx('dsh-input', size === 'small' && 'dsh-input-sm', className)}
            data-size={size}
            data-invalid={error ? true : undefined}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            id={id}
            maxLength={maxLength}
            autoComplete={autoComplete}
            spellCheck={spellCheck}
        />
    );
    return Object.hasOwn(props, 'error') ? (
        <span className="dsh-text-field-validation">
            {input}
            <FieldError error={error} />
        </span>
    ) : (
        input
    );
}
