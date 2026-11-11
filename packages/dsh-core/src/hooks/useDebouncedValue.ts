import { useEffect, useState } from 'react';
import { Delay } from '../constants/delay.js';

/**
 * Возвращает отложенное значение для поисковых полей и фильтров без лишних перерисовок.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = Delay.AutocompleteSearch): T {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(value);
        }, delayMs);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delayMs]);

    return debounced;
}
