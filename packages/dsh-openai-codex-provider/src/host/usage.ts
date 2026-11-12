export const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

interface UsageWindowInput {
    used_percent?: number | string;
    limit_window_seconds?: number | string;
    reset_at?: number | string;
    reset_after_seconds?: number | string;
}

interface UsagePayload {
    rate_limit?: {
        primary_window?: UsageWindowInput;
        secondary_window?: UsageWindowInput;
        limit_reached?: boolean;
        allowed?: boolean;
    };
    additional_rate_limits?: Array<{ limit_name?: string; rate_limit?: UsagePayload['rate_limit'] }>;
    credits?: { has_credits?: boolean; unlimited?: boolean; balance?: number | string };
    rate_limit_reset_credits?: { available_count?: number };
}

interface UsageLimit {
    name: string;
    usedPercent: number;
    windowSeconds: number;
    resetAt: number;
}

interface CodexUsage {
    limits: UsageLimit[];
    limited: boolean;
    resetCredits: number | undefined;
    credits: { hasCredits: boolean; unlimited: boolean; balance: string };
}

/** Читает ограниченный объем ответа, включая потоковую передачу без Content-Length. */
export async function readUsageJson<T extends object = UsagePayload>(response: Response): Promise<T> {
    if (!response.body) throw new Error('OpenAI Codex usage response was empty');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_RESPONSE_BYTES) throw new Error('OpenAI Codex usage response was too large');
            chunks.push(value);
        }
    } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function finiteNumber(value: number | string | undefined): number | undefined {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : undefined;
}

function normalizeWindow(value: UsageWindowInput | undefined, name: string, now: number): UsageLimit | undefined {
    if (!value) return undefined;
    const used = finiteNumber(value.used_percent);
    if (used === undefined) return undefined;
    const window = finiteNumber(value.limit_window_seconds);
    const reset = finiteNumber(value.reset_at);
    const after = finiteNumber(value.reset_after_seconds);
    const resetAt = reset !== undefined ? reset * 1000 : after !== undefined ? now + Math.max(0, after) * 1000 : 0;
    return { name, usedPercent: Math.min(100, Math.max(0, used)), windowSeconds: window === undefined ? 0 : Math.max(0, window), resetAt };
}

function appendRateLimit(target: UsageLimit[], rateLimit: UsagePayload['rate_limit'], name: string, now: number): void {
    if (!rateLimit) return;
    const primary = normalizeWindow(rateLimit.primary_window, name, now);
    const secondary = normalizeWindow(rateLimit.secondary_window, name, now);
    if (primary) target.push(primary);
    if (secondary) target.push(secondary);
}

/** Удаляет идентификаторы и оставляет только сводные поля лимитов. */
export function parseCodexUsage(payload: UsagePayload, now = Date.now()): CodexUsage {
    const limits: UsageLimit[] = [];
    appendRateLimit(limits, payload.rate_limit, 'Codex', now);
    for (const entry of (payload.additional_rate_limits ?? []).slice(0, 8)) {
        if (typeof entry.limit_name === 'string' && entry.limit_name.length > 0 && entry.limit_name.length <= 80)
            appendRateLimit(limits, entry.rate_limit, entry.limit_name, now);
    }
    const rateLimit = payload.rate_limit;
    const credits = payload.credits;
    const hasCredits = credits?.has_credits === true;
    const rawBalance = hasCredits ? credits.balance : undefined;
    const balance =
        typeof rawBalance === 'number' && Number.isFinite(rawBalance)
            ? String(rawBalance)
            : typeof rawBalance === 'string' && /^\d+(?:\.\d+)?$/.test(rawBalance)
              ? rawBalance
              : '';
    const available = payload.rate_limit_reset_credits?.available_count;
    return {
        limits,
        limited: rateLimit?.limit_reached === true || rateLimit?.allowed === false,
        resetCredits: Number.isSafeInteger(available) && available !== undefined && available >= 0 ? available : undefined,
        credits: { hasCredits, unlimited: hasCredits && credits?.unlimited === true, balance }
    };
}

interface OAuthCredential {
    access: string;
    accountId: string;
}

export async function requestCodexUsage(
    credential: OAuthCredential,
    fetchImpl: typeof fetch = globalThis.fetch,
    now = Date.now()
): Promise<CodexUsage> {
    if (!credential.access || !credential.accountId) throw new Error('OpenAI Codex usage requires a valid OAuth credential');
    const response = await fetchImpl(CODEX_USAGE_URL, {
        method: 'GET',
        redirect: 'error',
        headers: { Authorization: `Bearer ${credential.access}`, 'chatgpt-account-id': credential.accountId, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(`OpenAI Codex usage request failed (${response.status})`);
    }
    return parseCodexUsage(await readUsageJson(response), now);
}
