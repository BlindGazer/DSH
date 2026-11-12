import { describe, expect, it } from 'vitest';
import {
    consumeResetCredit,
    createResetRedeemer,
    parseResetCredits,
    RESET_CREDITS_URL,
    requestResetCredits
} from '../src/host/reset-credits.js';

const credential = { access: 'mock-access', accountId: 'mock-account' };
const input = { idempotencyKey: '12345678-1234-4234-8234-123456789abc', confirmed: true, creditId: 'private-id' };
const details = {
    available_count: 2,
    credits: [
        {
            id: 'private-id',
            status: 'available',
            reset_type: 'codex_rate_limits',
            expires_at: '2099-07-17T00:00:00Z',
            profile_user_id: 'private-user'
        },
        { id: 'second-card', status: 'available', reset_type: 'codex_rate_limits' },
        { id: 'used-card', status: 'redeemed', reset_type: 'codex_rate_limits' }
    ]
};
const json = (payload: object): Response => Response.json(payload);

describe('Codex reset credits', () => {
    it('фильтрует карточки, скрывает лишние поля и сортирует срок действия', () => {
        expect(parseResetCredits(details, Date.parse('2026-01-01'))).toEqual({
            availableCount: 2,
            cards: [
                { id: 'private-id', expiresAt: Date.parse('2099-07-17T00:00:00Z') },
                { id: 'second-card', expiresAt: undefined }
            ]
        });
    });

    it('читает список только через мокированный GET', async () => {
        const result = await requestResetCredits(credential, async (url, init) => {
            expect(String(url)).toBe(RESET_CREDITS_URL);
            expect(init?.method).toBe('GET');
            return json(details);
        });
        expect(result.availableCount).toBe(2);
    });

    it('отправляет подтвержденное погашение с тем же ключом идемпотентности', async () => {
        const result = await consumeResetCredit(credential, input, async (url, init) => {
            expect(String(url)).toBe(`${RESET_CREDITS_URL}/consume`);
            expect(init?.method).toBe('POST');
            expect(JSON.parse(String(init?.body))).toEqual({ redeem_request_id: input.idempotencyKey, credit_id: input.creditId });
            return json({ code: 'reset' });
        });
        expect(result).toBe('reset');
    });

    it('не повторяет неопределенное списание автоматически и принимает ручной повтор с теми же данными', async () => {
        const redeem = createResetRedeemer();
        const requests: Array<{ method: string; body: string }> = [];
        let postAttempts = 0;
        const fetchMock: typeof fetch = async (_url, init) => {
            const method = init?.method ?? 'GET';
            const body = typeof init?.body === 'string' ? init.body : '';
            requests.push({ method, body });
            if (method === 'GET') return json(details);
            postAttempts += 1;
            if (postAttempts === 1) throw new Error('connection lost after submission');
            return json({ code: 'reset' });
        };

        await expect(redeem(credential, input, fetchMock)).resolves.toBe('unknown');
        expect(requests).toHaveLength(2);
        expect(requests.map(({ method }) => method)).toEqual(['GET', 'POST']);
        const originalPost = requests[1];
        expect(originalPost?.body).toBe(JSON.stringify({ redeem_request_id: input.idempotencyKey, credit_id: input.creditId }));

        await expect(redeem(credential, input, fetchMock)).resolves.toBe('reset');
        expect(requests).toHaveLength(3);
        expect(requests[2]).toEqual(originalPost);
        expect(postAttempts).toBe(2);
    });

    it('не отправляет запрос без валидного подтверждения', async () => {
        await expect(
            consumeResetCredit(credential, { ...input, confirmed: false }, async () => {
                throw new Error('transport must not run');
            })
        ).rejects.toThrow('Invalid reset confirmation');
    });

    it('дедуплицирует одновременные погашения и запоминает результат', async () => {
        const redeem = createResetRedeemer();
        let calls = 0;
        const fetchMock: typeof fetch = async (_url, init) => {
            calls += 1;
            return json(init?.method === 'GET' ? details : { code: 'reset' });
        };
        await expect(Promise.all([redeem(credential, input, fetchMock), redeem(credential, input, fetchMock)])).resolves.toEqual([
            'reset',
            'reset'
        ]);
        expect(calls).toBe(2);
        await expect(
            redeem(credential, input, async () => {
                throw new Error('must not replay');
            })
        ).resolves.toBe('reset');
    });
});
