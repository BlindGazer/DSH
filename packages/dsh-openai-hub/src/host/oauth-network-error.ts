import { OAuthFailureMessages } from '../shared/constants/oauth-errors.js';
import { OAuthExceptionNameSchema, type OpenAIHubLogEvent, OpenAIHubNetworkErrorSchema } from '../shared/logging.js';

export interface OAuthFailureDiagnostic {
    errorCode: keyof typeof OAuthFailureMessages;
    errorMessage: (typeof OAuthFailureMessages)[keyof typeof OAuthFailureMessages];
    networkError: NonNullable<OpenAIHubLogEvent['networkError']>;
    errorCauses: NonNullable<OpenAIHubLogEvent['errorCauses']>;
    networkTimeoutMs?: number;
}

// Исключение может содержать токены в message/stack; сохраняем только проверенные имена, коды и числовой таймаут.
export function oauthNetworkFailure(
    error: Error | undefined,
    fallback: keyof typeof OAuthFailureMessages = 'oauth_network_failed'
): OAuthFailureDiagnostic {
    const pending = error ? [error] : [];
    const visited = new Set<Error>();
    const errorCauses: OAuthFailureDiagnostic['errorCauses'] = [];
    let networkTimeoutMs: number | undefined;
    while (pending.length > 0 && errorCauses.length < 8) {
        const current = pending.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const name = OAuthExceptionNameSchema.safeParse(current.name);
        const code = OpenAIHubNetworkErrorSchema.safeParse('code' in current ? current.code : undefined);
        errorCauses.push({ name: name.success ? name.data : 'other', code: code.success ? code.data : 'other' });
        const timeout = Number(/\btimeout:\s*(\d+)ms\b/i.exec(current.message)?.[1]);
        if (Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 600_000) networkTimeoutMs ??= timeout;
        if (current.cause instanceof Error) pending.push(current.cause);
        if (current instanceof AggregateError) {
            for (const child of current.errors) if (child instanceof Error) pending.push(child);
        }
    }
    const networkError = errorCauses.find(cause => cause.code !== 'other')?.code ?? 'other';
    let errorCode = fallback;
    switch (networkError) {
        case 'UND_ERR_CONNECT_TIMEOUT':
        case 'ETIMEDOUT':
            errorCode = 'oauth_connect_timeout';
            break;
        case 'UND_ERR_HEADERS_TIMEOUT':
            errorCode = 'oauth_headers_timeout';
            break;
        case 'UND_ERR_BODY_TIMEOUT':
            errorCode = 'oauth_body_timeout';
            break;
        case 'ENOTFOUND':
        case 'EAI_AGAIN':
            errorCode = 'oauth_dns_failed';
            break;
        case 'ECONNREFUSED':
            errorCode = 'oauth_connection_refused';
            break;
        case 'ECONNRESET':
            errorCode = 'oauth_connection_reset';
            break;
        case 'CERT_HAS_EXPIRED':
        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
            errorCode = 'oauth_tls_failed';
            break;
    }
    return {
        errorCode,
        errorMessage: OAuthFailureMessages[errorCode],
        networkError,
        errorCauses,
        ...(networkTimeoutMs ? { networkTimeoutMs } : {})
    };
}
