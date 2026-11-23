import { type DshLocalizedClientContext, ensureCoreStyles } from '@kalex/dsh-core';
import { loggerDictionaries } from '../shared/localization.ts';
import { TYPERT_REMOTE } from '../shared/remote.ts';
import { LoggerSettingsSection } from './LoggerSettingsSection.tsx';
import { createLoggerRemote, type LoggerWireRemote } from './remote.ts';

const namespace = 'settings.logger';

export interface LoggerClientContext extends DshLocalizedClientContext {
    readonly remote: { $mount(contribution: typeof TYPERT_REMOTE): Promise<() => void | Promise<void>> };
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
    context.effect(() => context.locale.register(namespace, 'en', loggerDictionaries.en), 'logger locales (en)');
    context.effect(() => context.locale.register(namespace, 'ru', loggerDictionaries.ru), 'logger locales (ru)');
    const translateLabel = context.locale.bind(namespace);
    const remote = createLoggerRemote(wire);
    context.slots.inject('settings.section', () =>
        context.slots.register(
            { name: 'settings.section', id: 'dsh-logger', order: 70, locale: namespace, label: () => translateLabel('title') },
            ({ t }) => <LoggerSettingsSection remote={remote} text={t} />
        )
    );
    return dispose;
}
