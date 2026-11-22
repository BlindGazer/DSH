import { Context } from '@deepseek-ai/cordis';
import { describe, expect, it } from 'vitest';
import { Config, DshLoggerService } from '../src/host/index.ts';
import { LoggerSettings } from '../src/host/settings.ts';
import type { DshLogger } from '../src/shared/index.ts';

describe('dsh logger host entry', () => {
    it('reads the provided registry with real Cordis context and normalizes Host entry names', async () => {
        const context = new Context();
        const service = new DshLoggerService(context);
        const consumer = context.extend({ fiber: { name: '@scope/consumer/host' } });
        const logger: DshLogger = Reflect.get(consumer, 'dshLogger');
        logger.record({ event: 'disabled' });
        expect(service.listPackageNames()).toEqual(['@scope/consumer']);
        expect((await new LoggerSettings(context, { enabled: false }).read()).packageNames).toEqual(['@scope/consumer']);
    });

    it('registers the service and scoped accessor with lifecycle cleanup', () => {
        let cleanup: (() => void) | undefined;
        let provided: DshLoggerService | undefined;
        let accessorName = '';
        const context = {
            fiber: { name: '@scope/host-entry' },
            provide: (_name: string, value: DshLoggerService): (() => void) => {
                provided = value;
                return () => undefined;
            },
            accessor: (name: string): void => {
                accessorName = name;
            },
            effect: (effect: () => () => void): void => {
                cleanup = effect();
            }
        };
        const service = new DshLoggerService(context);
        expect(Config.parse({})).toMatchObject({ enabled: false, level: 'info', maxFileBytes: 10485760 });
        expect(service).toBe(provided);
        expect(accessorName).toBe('dshLogger');
        expect(cleanup).toBeDefined();
        cleanup?.();
    });
});
