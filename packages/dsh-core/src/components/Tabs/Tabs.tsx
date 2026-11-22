import { TestId } from '../../constants/testId.ts';
import type { SelectOption } from '../../models/SelectOption.ts';
import { cx } from '../../utils/classNames.ts';

/**
 * Свойства панели вкладок Tabs.
 */
export interface TabsProps<TTab extends string = string> {
    readonly items: ReadonlyArray<SelectOption<TTab>>;
    readonly activeValue: TTab;
    readonly onChange: (nextTab: TTab) => void;
    readonly className?: string;
    readonly tabClassName?: string;
}

/**
 * Панель вкладок без пустой кликабельной области справа и с видимыми границами активной вкладки.
 */
export function Tabs<TTab extends string = string>({ items, activeValue, onChange, className, tabClassName }: TabsProps<TTab>) {
    return (
        <div data-testid={TestId.Common.TabsList} className={cx('dsh-tabs', 'ar-tabs', className)}>
            {items.map(item => {
                const isActive = item.value === activeValue;
                return (
                    <button
                        key={item.value}
                        type="button"
                        data-testid={TestId.Common.TabButton}
                        disabled={item.disabled}
                        className={cx('dsh-tab', 'ar-tab', isActive && 'active', tabClassName)}
                        onClick={() => {
                            if (!item.disabled && item.value !== activeValue) {
                                onChange(item.value);
                            }
                        }}>
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
