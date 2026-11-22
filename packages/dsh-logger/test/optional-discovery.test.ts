import { Context } from '@deepseek-ai/cordis';
import { createOptionalLogger, type DshLogger } from '@kalex/dsh-logger-core';
import { describe, expect, it } from 'vitest';
import { DshLoggerService } from '../src/host/index.ts';
import { LoggerSettings } from '../src/host/settings.ts';

const packages = ['@kalex/dsh-agents-router', '@kalex/dsh-openai-hub', '@kalex/dsh-proxy-provider'];

async function flush(root: Context): Promise<void> {
    await root.plugin({ apply() {} });
}

describe('real Cordis logger discovery', () => {
    it('discovers explicit package identities while disabled and rebinds without restarting consumers', async () => {
        const root = new Context();
        const handles: DshLogger[] = [];
        let starts = 0;
        const consumers = [];
        for (const packageName of packages) {
            consumers.push(
                await root.plugin({
                    name: `file:///plugins/${packageName}/lib/index.js`,
                    apply(context: Context) {
                        starts++;
                        handles.push(createOptionalLogger(context, packageName));
                    }
                })
            );
        }
        expect(starts).toBe(3);
        for (const handle of handles) expect(() => handle.record({ event: 'absent' })).not.toThrow();
        const config = { enabled: false, plugins: Object.fromEntries(packages.map(packageName => [packageName, { enabled: false }])) };
        const settings = new LoggerSettings(root, { enabled: false });
        const mount = () =>
            root.plugin({
                name: 'logger-provider',
                apply(context: Context) {
                    void new DshLoggerService(context, config);
                }
            });
        const provider = await mount();
        try {
            await flush(root);
            expect((await settings.read()).packageNames).toEqual(packages);
            await provider.dispose();
            for (const handle of handles) expect(() => handle.record({ event: 'unloaded' })).not.toThrow();
            expect((await settings.read()).packageNames).toEqual([]);
            const replacement = await mount();
            try {
                await flush(root);
                expect((await settings.read()).packageNames).toEqual(packages);
                expect(starts).toBe(3);
                for (const consumer of consumers) await consumer.dispose();
                await replacement.dispose();
                const finalProvider = await mount();
                try {
                    await flush(root);
                    expect((await settings.read()).packageNames).toEqual([]);
                } finally {
                    await finalProvider.dispose();
                }
            } finally {
                await replacement.dispose();
            }
        } finally {
            for (const consumer of consumers) await consumer.dispose();
            await provider.dispose();
        }
    });
});
