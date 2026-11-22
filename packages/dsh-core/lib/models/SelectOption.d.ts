/**
 * Элемент выпадающего списка ThemedSelect.
 */
export interface SelectOption<TValue extends string = string> {
    readonly value: TValue;
    readonly label: string;
    readonly disabled?: boolean;
}
