import { readUsageJson } from './usage.js';

export const RESET_CREDITS_URL = 'https://chatgpt.com/backend-api/wham/rate-limit-reset-credits';
export const RESET_CODES = ['reset', 'already_redeemed', 'no_credit', 'nothing_to_reset'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ResetRequest {
    idempotencyKey: string;
    confirmed: boolean;
    creditId: string;
}

interface ResetCredential {
    access: string;
    accountId: string;
}

interface ResetCardInput {
    id?: string;
    status?: string;
    reset_type?: string;
    expires_at?: string;
}

interface ResetPayload {
    available_count?: number;
    credits?: ResetCardInput[];
}

interface ResetCard {
    id: string;
    expiresAt: number | undefined;
}

interface ResetDetails {
    availableCount: number;
    cards: ResetCard[];
}

type ResetCode = (typeof RESET_CODES)[number];
type RedeemResult = ResetCode | 'account_changed' | 'pending' | 'unknown' | 'unavailable';

export function validateResetRequest(value: ResetRequest): ResetRequest {
    if (
        Object.keys(value).some(key => !['idempotencyKey', 'confirmed', 'creditId'].includes(key)) ||
        typeof value.creditId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,200}$/.test(value.creditId) ||
        value.confirmed !== true ||
        typeof value.idempotencyKey !== 'string' ||
        !uuid.test(value.idempotencyKey)
    ) {
        throw new Error('Invalid reset confirmation');
    }
    return value;
}

async function request(
    credential: ResetCredential,
    fetchImpl: typeof fetch,
    body?: { redeem_request_id: string; credit_id: string }
): Promise<Record<string, string>> {
    if (!credential.access || !credential.accountId) throw new Error('Reset credits require sign-in');
    const response = await fetchImpl(RESET_CREDITS_URL + (body ? '/consume' : ''), {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        headers: {
            Authorization: `Bearer ${credential.access}`,
            'chatgpt-account-id': credential.accountId,
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error('Reset credits request failed');
    }
    return await readUsageJson<Record<string, string>>(response);
}

export function parseResetCredits(payload: ResetPayload, now = Date.now()): ResetDetails {
    if (
        !Number.isSafeInteger(payload.available_count) ||
        payload.available_count === undefined ||
        payload.available_count < 0 ||
        !Array.isArray(payload.credits) ||
        payload.credits.length > 1000
    )
        throw new Error('Invalid reset credits');
    const cards = payload.credits
        .filter(
            card =>
                card.status === 'available' &&
                card.reset_type === 'codex_rate_limits' &&
                typeof card.id === 'string' &&
                /^[A-Za-z0-9_-]{1,200}$/.test(card.id)
        )
        .map((card): ResetCard => {
            const expires = typeof card.expires_at === 'string' ? Date.parse(card.expires_at) : Number.NaN;
            return { id: card.id as string, expiresAt: Number.isFinite(expires) && expires > 0 ? expires : undefined };
        })
        .filter(card => card.expiresAt === undefined || card.expiresAt > now)
        .toSorted((left, right) => (left.expiresAt ?? Number.POSITIVE_INFINITY) - (right.expiresAt ?? Number.POSITIVE_INFINITY));
    return { availableCount: payload.available_count, cards };
}

export async function requestResetCredits(credential: ResetCredential, fetchImpl: typeof fetch = globalThis.fetch): Promise<ResetDetails> {
    return parseResetCredits((await request(credential, fetchImpl)) as ResetPayload);
}

/** Вызывается только после явного подтверждения пользователя. */
export async function consumeResetCredit(
    credential: ResetCredential,
    input: ResetRequest,
    fetchImpl: typeof fetch = globalThis.fetch
): Promise<ResetCode> {
    validateResetRequest(input);
    const result = await request(credential, fetchImpl, { redeem_request_id: input.idempotencyKey, credit_id: input.creditId });
    if (!RESET_CODES.includes(result.code as ResetCode)) throw new Error('Unknown reset result');
    return result.code as ResetCode;
}

interface Attempt {
    accountId: string;
    creditId: string;
    sent?: boolean;
    result?: RedeemResult;
    promise: Promise<RedeemResult> | undefined;
}

export function createResetRedeemer(): (
    credential: ResetCredential,
    input: ResetRequest,
    fetchImpl: typeof fetch,
    isCurrent?: () => boolean
) => Promise<RedeemResult> {
    const attempts = new Map<string, Attempt>();
    let pending: string | undefined;
    return async (credential, input, fetchImpl, isCurrent = () => true) => {
        validateResetRequest(input);
        const key = input.idempotencyKey;
        let entry = attempts.get(key);
        if (entry && entry.accountId !== credential.accountId) return 'account_changed';
        if (entry && entry.creditId !== input.creditId) throw new Error('Reset attempt cannot change cards');
        if (entry?.result) return entry.result;
        if (entry?.promise) return entry.promise;
        if (pending && pending !== key) return 'pending';
        if (!entry) {
            if (attempts.size >= 100) return 'pending';
            entry = { accountId: credential.accountId, creditId: input.creditId, promise: undefined };
            attempts.set(key, entry);
        }
        pending = key;
        const currentEntry = entry;
        currentEntry.promise = (async (): Promise<RedeemResult> => {
            try {
                if (!currentEntry.sent) {
                    const details = await requestResetCredits(credential, fetchImpl);
                    if (details.availableCount === 0 || !details.cards.some(card => card.id === input.creditId)) return 'no_credit';
                }
                if (!isCurrent()) return 'account_changed';
                currentEntry.sent = true;
                return await consumeResetCredit(credential, input, fetchImpl);
            } catch {
                return currentEntry.sent ? 'unknown' : 'unavailable';
            }
        })()
            .then(code => {
                if (code !== 'unknown') {
                    currentEntry.result = code;
                    pending = undefined;
                }
                return code;
            })
            .finally(() => {
                currentEntry.promise = undefined;
            });
        return currentEntry.promise;
    };
}
