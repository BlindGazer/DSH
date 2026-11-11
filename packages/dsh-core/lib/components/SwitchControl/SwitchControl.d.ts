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
export declare function SwitchControl({ checked, onChange, disabled, labelledBy, ariaLabel, className }: SwitchControlProps): import("react").JSX.Element;
