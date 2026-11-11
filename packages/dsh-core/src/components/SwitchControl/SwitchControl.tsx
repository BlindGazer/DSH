import { TestId } from '../../constants/testId.js';
import { cx } from '../../utils/classNames.js';

/**
 * Свойства переключателя SwitchControl.
 */
export interface SwitchControlProps {
    readonly checked: boolean;
    readonly onChange: (nextChecked: boolean) => void;
    readonly disabled?: boolean;
    readonly labelledBy?: string;
    readonly ariaLabel?: string;
    readonly className?: string;
}

/**
 * Переключатель состояния (вкл/выкл) в стиле оболочки DSH.
 */
export function SwitchControl({ checked, onChange, disabled = false, labelledBy, ariaLabel, className }: SwitchControlProps) {
    return (
        <button
            type="button"
            role="switch"
            data-testid={TestId.Common.Switch}
            aria-labelledby={labelledBy}
            aria-label={ariaLabel}
            aria-checked={checked}
            disabled={disabled}
            className={cx('dsh-switch', 'ar-settings-switch', className)}
            onClick={() => {
                if (!disabled) {
                    onChange(!checked);
                }
            }}>
            <span />
        </button>
    );
}
