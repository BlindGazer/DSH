import type { SelectOption } from '../../models/SelectOption.ts';
/**
 * Свойства выпадающего списка ThemedSelect.
 */
export interface ThemedSelectProps<TValue extends string = string> {
    readonly value: TValue;
    readonly size?: 'small' | 'standard';
    readonly options: ReadonlyArray<SelectOption<TValue>>;
    readonly onChange: (nextValue: TValue) => void;
    readonly disabled?: boolean;
    readonly fullWidth?: boolean;
    readonly showCheckmark?: boolean;
    readonly className?: string;
    readonly triggerClassName?: string;
    readonly menuClassName?: string;
    readonly optionClassName?: string;
    readonly id?: string;
    readonly error?: string | undefined;
}
/**
 * Стандартизированный выпадающий список дизайн-системы @kalex/dsh-core.
 * Рендерит меню в DOM (избегая белого нативного попапа Chromium в темной теме) и поддерживает клавиатуру.
 */
export declare function ThemedSelect<TValue extends string = string>({ value, size, options, onChange, disabled, fullWidth, showCheckmark, className, triggerClassName, menuClassName, optionClassName, id, error }: ThemedSelectProps<TValue>): import("react").JSX.Element;
