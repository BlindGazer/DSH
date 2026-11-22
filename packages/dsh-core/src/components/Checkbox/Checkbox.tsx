import type { ChangeEvent } from 'react';

import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';

export interface CheckboxProps {
    readonly checked: boolean;
    readonly onChange: (checked: boolean) => void;
    readonly disabled?: boolean;
    readonly id?: string;
    readonly className?: string;
}

export function Checkbox({ checked, onChange, disabled = false, id, className }: CheckboxProps) {
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        onChange(event.currentTarget.checked);
    };

    return (
        <input
            type="checkbox"
            className={cx('dsh-checkbox', className)}
            data-testid={TestId.Common.Checkbox}
            checked={checked}
            disabled={disabled}
            id={id}
            onChange={handleChange}
        />
    );
}
