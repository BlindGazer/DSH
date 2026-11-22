export interface CheckboxProps {
    readonly checked: boolean;
    readonly onChange: (checked: boolean) => void;
    readonly disabled?: boolean;
    readonly id?: string;
    readonly className?: string;
}
export declare function Checkbox({ checked, onChange, disabled, id, className }: CheckboxProps): import("react").JSX.Element;
