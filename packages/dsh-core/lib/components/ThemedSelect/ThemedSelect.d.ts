import type { SelectOption } from '../../models/SelectOption.js';
/**
 * Свойства выпадающего списка ThemedSelect.
 */
export interface ThemedSelectProps<TValue extends string = string> {
    readonly value: TValue;
    readonly options: ReadonlyArray<SelectOption<TValue>>;
    readonly onChange: (nextValue: TValue) => void;
    readonly ariaLabel?: string;
    readonly disabled?: boolean;
    readonly fullWidth?: boolean;
    readonly showCheckmark?: boolean;
    readonly className?: string;
    readonly triggerClassName?: string;
    readonly menuClassName?: string;
    readonly optionClassName?: string;
}
/**
 * Стандартизированный выпадающий список дизайн-системы @kalex/dsh-core.
 * Рендерит меню в DOM (избегая белого нативного попапа Chromium в темной теме) и поддерживает клавиатуру.
 */
export declare function ThemedSelect<TValue extends string = string>({ value, options, onChange, ariaLabel, disabled, fullWidth, showCheckmark, className, triggerClassName, menuClassName, optionClassName }: ThemedSelectProps<TValue>): import("react").JSX.Element;
