import { type DshClientContext, type DshLocaleService, ensureCoreStyles } from '@kalex/dsh-core';
import { loggerDictionaries } from '../shared/localization.ts';
import { TYPERT_REMOTE } from '../shared/remote.ts';
import { LoggerSettingsSection } from './LoggerSettingsSection.tsx';
import { createLoggerRemote, type LoggerWireRemote } from './remote.ts';

interface LoggerLocale extends DshLocaleService {
    register(namespace: string, dictionaries: typeof loggerDictionaries): () => void;
    bind(namespace: string): (key: string) => string;
}
export interface LoggerClientContext extends DshClientContext {
    readonly remote: { $mount(contribution: typeof TYPERT_REMOTE): Promise<() => void | Promise<void>> };
    readonly locale: LoggerLocale;
    get(name: string): LoggerWireRemote | undefined;
    effect(callback: () => () => void, label?: string): void;
}
export const name = '@kalex/dsh-logger';
export const inject = ['slots', 'locale', 'remote'];
export async function apply(context: LoggerClientContext): Promise<() => void | Promise<void>> {
    ensureCoreStyles();
    const dispose = await context.remote.$mount(TYPERT_REMOTE);
    const wire = context.get('remote.loggerSettings');
    if (!wire) {
        await dispose();
        throw new Error('Logger remote service unavailable');
    }
    context.effect(() => context.locale.register('settings.logger', loggerDictionaries), 'logger locales');
    const text = context.locale.bind('settings.logger');
    const remote = createLoggerRemote(wire);
    context.slots.inject('settings.section', () =>
        context.slots.register({ name: 'settings.section', id: 'dsh-logger', order: 70, label: () => text('title') }, () => (
            <LoggerSettingsSection remote={remote} text={text} />
        ))
    );
    return dispose;
}
