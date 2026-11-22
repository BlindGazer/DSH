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
export declare function SwitchControl({ checked, onChange, disabled, className }: SwitchControlProps): import("react").JSX.Element;
