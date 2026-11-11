import { useSyncExternalStore } from 'react';
import { getDshThemeRevision, subscribeDshThemeChanges } from '../theme/palettes.js';

/** Перерисовывает интерфейс после регистрации или переопределения темы. */
export function useDshThemeRevision(): number {
    return useSyncExternalStore(subscribeDshThemeChanges, getDshThemeRevision, getDshThemeRevision);
}
