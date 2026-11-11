import { useEffect, useRef, useState } from 'react';

import { TestId } from '../../constants/testId.js';
import type { SelectOption } from '../../models/SelectOption.js';
import { coreStyleScopeClass } from '../../theme/styles.js';
import { cx } from '../../utils/classNames.js';

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
export function ThemedSelect<TValue extends string = string>({
    value,
    options,
    onChange,
    ariaLabel,
    disabled = false,
    fullWidth = false,
    showCheckmark = false,
    className,
    triggerClassName,
    menuClassName,
    optionClassName
}: ThemedSelectProps<TValue>) {
    const rootRef = useRef<HTMLDivElement | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const foundIndex = options.findIndex(option => option.value === value);
    const selectedIndex = foundIndex >= 0 ? foundIndex : 0;
    const [activeIndex, setActiveIndex] = useState(selectedIndex);
    const selectedOption = options[selectedIndex];

    useEffect(() => {
        if (!open || typeof document === 'undefined') return undefined;
        const handleOutsideMouseDown = (event: MouseEvent): void => {
            const target = event.target as Node | undefined;
            if (rootRef.current && target && !rootRef.current.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideMouseDown, true);
        return () => {
            document.removeEventListener('mousedown', handleOutsideMouseDown, true);
        };
    }, [open]);

    const moveActive = (delta: number): void => {
        if (options.length === 0) return;
        setActiveIndex(prev => (prev + delta + options.length) % options.length);
    };

    const handleKeyDown = (event: { key: string; preventDefault(): void }): void => {
        if (disabled || options.length === 0) return;
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
                setActiveIndex(selectedIndex);
                setOpen(true);
            } else {
                moveActive(event.key === 'ArrowDown' ? 1 : -1);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (!open) {
                setActiveIndex(selectedIndex);
                setOpen(true);
            } else {
                const chosen = options[activeIndex];
                if (chosen && !chosen.disabled) {
                    onChange(chosen.value);
                    setOpen(false);
                }
            }
        }
    };

    return (
        <div
            ref={el => {
                rootRef.current = el ?? undefined;
            }}
            className={cx(
                coreStyleScopeClass,
                'dsh-select',
                'ar-themed-select',
                'kpp-dropdown',
                fullWidth && 'dsh-select-full kpp-dropdown-full',
                className
            )}>
            <button
                type="button"
                data-testid={TestId.Common.SelectTrigger}
                className={cx('dsh-select-trigger', 'ar-themed-select-trigger', 'kpp-dropdown-trigger', triggerClassName)}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onKeyDown={handleKeyDown}
                onClick={() => {
                    if (!disabled) {
                        setActiveIndex(selectedIndex);
                        setOpen(prev => !prev);
                    }
                }}>
                <span className="dsh-select-label">{selectedOption?.label ?? ''}</span>
                <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </svg>
            </button>
            {open ? (
                <div
                    role="listbox"
                    aria-label={ariaLabel}
                    data-testid={TestId.Common.SelectMenu}
                    className={cx('dsh-select-menu', 'ar-themed-select-menu', 'kpp-dropdown-menu', menuClassName)}>
                    {options.map((option, index) => {
                        const isSelected = index === selectedIndex;
                        const isActive = index === activeIndex;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                data-testid={TestId.Common.SelectOption}
                                aria-selected={isSelected}
                                disabled={option.disabled}
                                className={cx(
                                    'dsh-select-option',
                                    'kpp-dropdown-item',
                                    (isActive || isSelected) && 'active kpp-dropdown-item-active',
                                    optionClassName
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => {
                                    if (!option.disabled) {
                                        onChange(option.value);
                                        setOpen(false);
                                    }
                                }}>
                                <span>{option.label}</span>
                                {showCheckmark && isSelected ? <span aria-hidden="true">✓</span> : undefined}
                            </button>
                        );
                    })}
                </div>
            ) : undefined}
        </div>
    );
}
