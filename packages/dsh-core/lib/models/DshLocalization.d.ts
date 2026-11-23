import type { LocaleId } from '@deepseek-ai/dsh-client-locale';
import type { JSX } from 'react/jsx-runtime';
import type { DshSlotRegistrationOptions, DshSlotsService } from './DshContext.ts';
export type DshActiveLocale = LocaleId;
export type DshTranslate<Key extends string = string> = (key: Key, params?: Readonly<Record<string, string | number>>) => string;
export interface DshLocaleSnapshot {
    readonly active: DshActiveLocale;
    readonly revision: number;
}
export interface DshLocalizationService {
    register(namespace: string, locale: string, dictionary: Readonly<Record<string, string>>): () => void;
    bind(namespace: string): DshTranslate;
    getLocale(): DshLocaleSnapshot;
    getSnapshot(): DshLocaleSnapshot;
    subscribe(listener: () => void): () => void;
}
export interface DshLocalizedSlotRegistrationOptions extends DshSlotRegistrationOptions {
    readonly locale: string;
}
export interface DshLocalizedSlotProps {
    readonly t: DshTranslate;
}
export interface DshLocalizedSlotsService extends DshSlotsService {
    register<Props extends object = Record<never, never>>(options: DshLocalizedSlotRegistrationOptions, component: (props: Props & DshLocalizedSlotProps) => JSX.Element | undefined): () => void;
    register<Props = Record<string, string | undefined>>(options: DshSlotRegistrationOptions, component: (props: Props) => JSX.Element | undefined): () => void;
}
export interface DshLocalizedClientContext {
    readonly locale: DshLocalizationService;
    readonly slots: DshLocalizedSlotsService;
}
