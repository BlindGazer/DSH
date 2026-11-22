import { useSyncExternalStore } from 'react';
import { getDshThemeRevision, subscribeDshThemeChanges } from '../theme/palettes.ts';

/** Перерисовывает интерфейс после регистрации или переопределения темы. */
export function useDshThemeRevision(): number {
    return useSyncExternalStore(subscribeDshThemeChanges, getDshThemeRevision, getDshThemeRevision);
}
