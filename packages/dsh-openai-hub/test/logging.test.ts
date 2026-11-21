import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { OpenAIHubLogging } from '../src/host/logging.js';
import { OpenAIHubClientLogEventSchema } from '../src/shared/logging.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

async function createLogging() {
    const home = await mkdtemp(path.join(os.tmpdir(), 'openai-hub-logging-'));
    temporaryDirectories.push(home);
    const errors: string[] = [];
    const logging = new OpenAIHubLogging(message => errors.push(message), home);
    return { home, errors, logging };
}

describe('OpenAI Hub diagnostic logging', () => {
    test('logging is disabled by default and ignores events', async () => {
        const { logging } = await createLogging();

        await expect(logging.loadSettings()).resolves.toEqual({ enabled: false });
        await expect(logging.recordHost({ event: 'plugin', phase: 'started' })).resolves.toBe(false);
    });

    test('stores fixed callback rejection reasons and refuses URL or free-text diagnostic fields', async () => {
        const { logging } = await createLogging();
        await logging.saveSettings({ enabled: true });
        const event = {
            event: 'login',
            phase: 'failed',
            operation: 'submitCallbackUrl',
            errorCode: 'validation_failed',
            callbackError: 'duplicate_state'
        } as const;
        await expect(logging.recordHost(event)).resolves.toBe(true);
        expect(await readFile(logging.getLogPath(), 'utf8')).toContain('"callbackError":"duplicate_state"');
        expect(OpenAIHubClientLogEventSchema.safeParse({ ...event, url: 'http://localhost:1455/auth/callback?code=private' }).success).toBe(
            false
        );
        expect(OpenAIHubClientLogEventSchema.safeParse({ ...event, callbackError: 'private-code-value' }).success).toBe(false);
    });

    test('stores client and host events and deletes log files when disabled', async () => {
        const { logging, errors } = await createLogging();
        const logPath = logging.getLogPath();

        await logging.saveSettings({ enabled: true });
        await expect(logging.recordClient({ event: 'login', phase: 'started', accountLabel: 'primary' })).resolves.toBe(true);
        await expect(logging.recordHost({ event: 'login', phase: 'waiting', authMethod: 'device-code' })).resolves.toBe(true);
        await expect(
            logging.recordHost({
                event: 'catalog_refresh',
                phase: 'completed',
                operation: 'refreshCatalog',
                endpoint: 'codex_models',
                httpStatus: 200,
                responseShape: 'models',
                count: 3
            })
        ).resolves.toBe(true);
        await expect(
            logging.recordHost({
                event: 'usage_refresh',
                phase: 'completed',
                operation: 'refreshUsage',
                requestJson: { endpoint: 'codex_usage', method: 'GET', body: 'none' },
                responseJson: {
                    status: 200,
                    contentType: 'application/json',
                    shape: 'usage',
                    fields: ['rate_limit', 'credits'],
                    itemCount: 2
                }
            })
        ).resolves.toBe(true);

        const contents = await readFile(logPath, 'utf8');
        expect(contents).toContain('"source":"client"');
        expect(contents).toContain('"source":"host"');
        expect(contents).toContain('"event":"login"');
        expect(errors).toEqual([]);

        await logging.saveSettings({ enabled: false });
        await expect(readdir(path.dirname(logPath))).resolves.toEqual([]);
        await expect(logging.recordHost({ event: 'plugin', phase: 'stopped' })).resolves.toBe(false);
        await expect(logging.loadSettings()).resolves.toEqual({ enabled: false });
    });
});
