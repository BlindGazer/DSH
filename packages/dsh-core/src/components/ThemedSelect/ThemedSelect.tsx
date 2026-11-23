import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { TestId } from '../../constants/testId.ts';
import type { SelectOption } from '../../models/SelectOption.ts';
import { coreStyleScopeClass } from '../../theme/styles.ts';
import { cx } from '../../utils/classNames.ts';
import { FieldError } from '../FieldError/FieldError.tsx';

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
    readonly search?: { readonly placeholder: string; readonly emptyText: string };
}

/**
 * Стандартизированный выпадающий список дизайн-системы @kalex/dsh-core.
 * Рендерит меню в DOM (избегая белого нативного попапа Chromium в темной теме) и поддерживает клавиатуру.
 */
export function ThemedSelect<TValue extends string = string>({
    value,
    size = 'standard',
    options,
    onChange,
    disabled = false,
    fullWidth = false,
    showCheckmark = false,
    className,
    triggerClassName,
    menuClassName,
    optionClassName,
    id,
    error,
    search
}: ThemedSelectProps<TValue>) {
    const rootRef = useRef<HTMLDivElement | undefined>(undefined);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const keyboardMove = useRef(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const filter = query.trim().toLowerCase();
    const visibleOptions =
        search && filter ? options.filter(option => !option.disabled && option.label.toLowerCase().includes(filter)) : options;
    const foundIndex = options.findIndex(option => option.value === value);
    const selectedIndex = Math.max(foundIndex, 0);
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

    const searchable = search !== undefined;
    useEffect(() => {
        if (!open || !searchable) return;
        searchRef.current?.focus();
        const closeOnFocusOutside = (event: FocusEvent): void => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('focusin', closeOnFocusOutside);
        return () => document.removeEventListener('focusin', closeOnFocusOutside);
    }, [open, searchable]);

    useEffect(() => {
        if (!keyboardMove.current || !open) return;
        keyboardMove.current = false;
        const menu = menuRef.current;
        const option = menu?.children.item(activeIndex + (searchable ? 1 : 0));
        if (!(option instanceof HTMLElement) || menu === null) return;
        const item = option.getBoundingClientRect();
        const viewport = menu.getBoundingClientRect();
        const top = searchRef.current?.getBoundingClientRect().bottom ?? viewport.top;
        if (item.top < top) menu.scrollTop += item.top - top;
        if (item.bottom > viewport.bottom) menu.scrollTop += item.bottom - viewport.bottom;
    }, [activeIndex, open, searchable]);

    const dismissOnEscape = (event: KeyboardEvent): void => {
        if (!open || event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
    };

    const moveActive = (delta: number): void => {
        const count = visibleOptions.length;
        if (count === 0) return;
        setActiveIndex(prev => {
            for (let step = 1; step <= count; step++) {
                const index = (prev + delta * step + count) % count;
                if (!visibleOptions[index]?.disabled) return index;
            }
            return prev;
        });
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (disabled || options.length === 0) return;
        if (event.key === 'Escape') {
            dismissOnEscape(event);
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            keyboardMove.current = true;
            if (!open) {
                setQuery('');
                setActiveIndex(selectedIndex);
                setOpen(true);
            } else {
                moveActive(event.key === 'ArrowDown' ? 1 : -1);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (!open) {
                keyboardMove.current = true;
                setQuery('');
                setActiveIndex(selectedIndex);
                setOpen(true);
            } else {
                const chosen = visibleOptions[activeIndex];
                if (chosen && !chosen.disabled) {
                    onChange(chosen.value);
                    setOpen(false);
                    triggerRef.current?.focus();
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
                size === 'small' && 'dsh-select-sm',
                fullWidth && 'dsh-select-full',
                className
            )}
            data-size={size}>
            <button
                ref={triggerRef}
                type="button"
                id={id}
                data-invalid={error ? true : undefined}
                data-testid={TestId.Common.SelectTrigger}
                className={cx('dsh-select-trigger', 'ar-themed-select-trigger', triggerClassName)}
                disabled={disabled}
                onKeyDown={handleKeyDown}
                onClick={() => {
                    if (!disabled) {
                        setQuery('');
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
                    strokeLinejoin="round">
                    <path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </svg>
            </button>
            {open ? (
                <div
                    ref={menuRef}
                    data-testid={TestId.Common.SelectMenu}
                    className={cx('dsh-select-menu', 'ar-themed-select-menu', menuClassName)}>
                    {search ? (
                        <input
                            ref={searchRef}
                            className="dsh-input dsh-select-search"
                            placeholder={search.placeholder}
                            value={query}
                            disabled={disabled}
                            onKeyDown={handleKeyDown}
                            onChange={event => {
                                setQuery(event.currentTarget.value);
                                setActiveIndex(0);
                                if (menuRef.current) menuRef.current.scrollTop = 0;
                            }}
                        />
                    ) : null}
                    {visibleOptions.length === 0 && search ? <div>{search.emptyText}</div> : null}
                    {visibleOptions.map((option, index) => {
                        const isSelected = option.value === selectedOption?.value;
                        const isActive = index === activeIndex;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                data-testid={TestId.Common.SelectOption}
                                disabled={option.disabled}
                                className={cx('dsh-select-option', (isActive || isSelected) && 'active', optionClassName)}
                                onKeyDown={dismissOnEscape}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => {
                                    if (!option.disabled) {
                                        onChange(option.value);
                                        setOpen(false);
                                    }
                                }}>
                                <span>{option.label}</span>
                                {showCheckmark && isSelected ? <span>✓</span> : undefined}
                            </button>
                        );
                    })}
                </div>
            ) : undefined}
            <FieldError error={error} />
        </div>
    );
}
