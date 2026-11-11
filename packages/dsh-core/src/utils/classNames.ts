/**
 * Объединяет список CSS-классов, отбрасывая пустые и неопределенные значения.
 */
export function cx(...classes: ReadonlyArray<string | false | undefined>): string {
    return classes.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).join(' ');
}
