import type { Context } from '@deepseek-ai/cordis';
import type { DshLogger } from '@kalex/dsh-logger-core';
import type { LoggerConfig } from '../shared/index.ts';
import { LoggerConfigSchema } from '../shared/remote.ts';
import { LoggerSettingsRemoteService } from './remote-service.ts';
import { type LoggerContext, LoggerService } from './service.ts';
import { LoggerSettings } from './settings.ts';

export const name = 'dsh-logger';
export const inject = ['configEditor'];
export const Config = LoggerConfigSchema;

export interface HostLoggerContext {
    readonly fiber?: { readonly name?: string };
    readonly provide?: (name: string, value: DshLoggerService) => () => void;
    readonly accessor?: (name: string, options: { readonly get: (this: HostLoggerContext) => DshLogger }) => void;
    readonly effect?: (effect: () => () => void) => void;
    readonly get?: (name: string) => DshLoggerService | undefined;
}

export interface DshLoggerHostService {
    readonly getLogger: LoggerService['getLogger'];
    readonly load: LoggerService['load'];
    readonly unload: LoggerService['unload'];
    readonly listPackageNames: LoggerService['listPackageNames'];
}

/** Регистрирует scoped logger в контексте владельца Host-плагина. */
export class DshLoggerService implements DshLoggerHostService {
    public static readonly inject = ['configEditor'];
    private readonly runtime: LoggerService;

    public constructor(context: HostLoggerContext, config: LoggerConfig = { enabled: false }) {
        this.runtime = new LoggerService({ config });
        if (config.enabled) this.runtime.load(config, config.path !== undefined);
        context.provide?.('dshLoggerService', this);
        context.accessor?.('dshLogger', {
            get: function (): DshLogger {
                const service = this.get?.('dshLoggerService');
                const fiberName = this.fiber?.name;
                if (!service || typeof fiberName !== 'string') return { record: () => undefined };
                const packageName = fiberName.startsWith('@') ? fiberName.split('/').slice(0, 2).join('/') : fiberName.split('/')[0];
                if (!packageName) return { record: () => undefined };
                return service.getLogger({ packageName } satisfies LoggerContext, 'host');
            }
        });
        context.effect?.(() => () => this.runtime.unload());
    }

    public readonly getLogger: LoggerService['getLogger'] = (...args) => this.runtime.getLogger(...args);
    public readonly load: LoggerService['load'] = (config?: LoggerConfig): void => this.runtime.load(config);
    public readonly unload: LoggerService['unload'] = (): void => this.runtime.unload();
    public readonly listPackageNames: LoggerService['listPackageNames'] = () => this.runtime.listPackageNames();
}

export function apply(context: Context, config: LoggerConfig = { enabled: false }): void {
    void new DshLoggerService(context as HostLoggerContext, config);
    void new LoggerSettingsRemoteService(context, new LoggerSettings(context, config));
}
