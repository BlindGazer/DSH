import type { SelectOption } from '../../models/SelectOption.js';
/**
 * Свойства панели вкладок Tabs.
 */
export interface TabsProps<TTab extends string = string> {
    readonly items: ReadonlyArray<SelectOption<TTab>>;
    readonly activeValue: TTab;
    readonly onChange: (nextTab: TTab) => void;
    readonly ariaLabel?: string;
    readonly className?: string;
    readonly tabClassName?: string;
}
/**
 * Панель вкладок без пустой кликабельной области справа и с видимыми границами активной вкладки.
 */
export declare function Tabs<TTab extends string = string>({ items, activeValue, onChange, ariaLabel, className, tabClassName }: TabsProps<TTab>): import("react").JSX.Element;
