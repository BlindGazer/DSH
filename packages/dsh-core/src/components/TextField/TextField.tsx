import type { ChangeEvent, InputHTMLAttributes } from 'react';

import { cx } from '../../utils/classNames.js';

export interface TextFieldProps {
    readonly value: string;
    readonly size?: 'small' | 'standard';
    readonly onChange: (value: string) => void;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly ariaLabel?: string;
    readonly type?: InputHTMLAttributes<HTMLInputElement>['type'];
    readonly className?: string;
    readonly id?: string;
    readonly maxLength?: number;
    readonly autoComplete?: string;
    readonly spellCheck?: boolean;
}

export function TextField({
    value,
    size = 'standard',
    onChange,
    placeholder,
    disabled = false,
    ariaLabel,
    type = 'text',
    className,
    id,
    maxLength,
    autoComplete,
    spellCheck
}: TextFieldProps) {
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => onChange(event.currentTarget.value);
    return (
        <input
            type={type}
            className={cx('dsh-input', size === 'small' && 'dsh-input-sm', className)}
            data-size={size}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={ariaLabel}
            id={id}
            maxLength={maxLength}
            autoComplete={autoComplete}
            spellCheck={spellCheck}
        />
    );
}
