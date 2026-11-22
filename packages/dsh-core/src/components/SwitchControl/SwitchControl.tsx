import { TestId } from '../../constants/testId.ts';
import { cx } from '../../utils/classNames.ts';

/**
 * Свойства переключателя SwitchControl.
 */
export interface SwitchControlProps {
    readonly checked: boolean;
    readonly onChange: (nextChecked: boolean) => void;
    readonly disabled?: boolean;
    readonly className?: string;
}

/**
 * Переключатель состояния (вкл/выкл) в стиле оболочки DSH.
 */
export function SwitchControl({ checked, onChange, disabled = false, className }: SwitchControlProps) {
    return (
        <button
            type="button"
            data-testid={TestId.Common.Switch}
            data-checked={checked}
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
