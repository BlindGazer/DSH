import { createHash, randomBytes } from 'node:crypto';
import type { AuthInteraction } from '@earendil-works/pi-ai';
import { z } from 'zod';
import { type OpenAIHubLogEvent, OpenAIHubOAuthServerErrorSchema } from '../shared/logging.ts';
import { SubmitCallbackUrlRequestSchema } from '../shared/remote.ts';
import { BrowserLoginError } from './browser-login-error.ts';
import { type OAuthCredential, OAuthCredentialSchema } from './credentials.ts';
import { type OAuthFailureDiagnostic, oauthNetworkFailure } from './oauth-network-error.ts';

const clientId = 'app_EMoamEEZ73f0CkXaXp7hrann';
const redirectUri = 'http://localhost:1455/auth/callback';
const tokenSchema = z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_in: z.number().finite().positive()
});
const claimsSchema = z.object({
    'https://api.openai.com/auth': z.object({ chatgpt_account_id: z.string().min(1) })
});

// SDK запускает callback-сервер с собственным завершением; ручной режим должен ждать только ввод пользователя.
export async function loginBrowser(
    interaction: AuthInteraction,
    request: typeof fetch = fetch,
    report: (event: OpenAIHubLogEvent) => void = () => undefined,
    waitForRetry?: (error: BrowserLoginError, signal?: AbortSignal) => Promise<void>
): Promise<OAuthCredential> {
    const fail = (
        message: string,
        details: Pick<OpenAIHubLogEvent, 'loginStage' | 'httpStatus' | 'durationMs' | 'oauthServerError'>,
        failure?: OAuthFailureDiagnostic
    ) => {
        const code =
            details.loginStage === 'callback_validation'
                ? 'oauth_callback_invalid'
                : details.loginStage === 'token_response'
                  ? 'oauth_response_invalid'
                  : details.loginStage === 'account_claim'
                    ? 'oauth_claim_invalid'
                    : 'oauth_http_failed';
        const diagnostic: OpenAIHubLogEvent = {
            event: 'login',
            phase: 'failed',
            ...oauthNetworkFailure(undefined, code),
            ...failure,
            ...details,
            ...(details.loginStage !== 'callback_validation'
                ? ({
                      endpoint: 'oauth_token',
                      requestJson: { endpoint: 'oauth_token', method: 'POST', body: 'redacted' }
                  } as const)
                : {})
        };
        report(diagnostic);
        return new BrowserLoginError(message, diagnostic);
    };
    interaction.signal?.throwIfAborted();
    const verifier = randomBytes(32).toString('base64url');
    const state = randomBytes(16).toString('hex');
    const url = new URL('https://auth.openai.com/oauth/authorize');
    url.search = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email offline_access',
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256',
        state,
        id_token_add_organizations: 'true',
        codex_cli_simplified_flow: 'true',
        originator: 'pi'
    }).toString();
    interaction.notify({ type: 'auth_url', url: url.toString() });
    const input = await interaction.prompt({ type: 'manual_code', message: 'Paste the callback URL', placeholder: redirectUri });
    interaction.signal?.throwIfAborted();
    const callback = new URL(SubmitCallbackUrlRequestSchema.parse({ url: input }).url);
    if (
        callback.origin !== 'http://localhost:1455' ||
        callback.pathname !== '/auth/callback' ||
        callback.username ||
        callback.password ||
        callback.hash
    )
        throw fail('Invalid OpenAI callback URL', { loginStage: 'callback_validation' });
    if (callback.searchParams.get('state') !== state)
        throw fail('OpenAI Hub callback belongs to another sign-in attempt. Start sign-in again.', { loginStage: 'callback_validation' });
    const code = callback.searchParams.get('code');
    if (!code) throw fail('OpenAI Hub callback code missing', { loginStage: 'callback_validation' });
    let response: Response;
    let startedAt = Date.now();
    while (true) {
        interaction.signal?.throwIfAborted();
        startedAt = Date.now();
        report({
            event: 'login',
            phase: 'started',
            loginStage: 'token_exchange',
            endpoint: 'oauth_token',
            requestJson: { endpoint: 'oauth_token', method: 'POST', body: 'redacted' }
        });
        try {
            response = await request('https://auth.openai.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    code,
                    code_verifier: verifier,
                    redirect_uri: redirectUri
                }),
                ...(interaction.signal ? { signal: interaction.signal } : {})
            });
            break;
        } catch (error) {
            if (interaction.signal?.aborted) throw error;
            const failure = oauthNetworkFailure(error instanceof Error ? error : undefined);
            const loginError = fail(
                `OpenAI Hub request to auth.openai.com: ${failure.errorMessage} [${failure.networkError}]`,
                { loginStage: 'token_exchange', durationMs: Date.now() - startedAt },
                failure
            );
            const canRetry = ['oauth_connect_timeout', 'oauth_headers_timeout', 'oauth_body_timeout'].includes(failure.errorCode);
            if (!canRetry || !waitForRetry) throw loginError;
            await waitForRetry(loginError, interaction.signal);
        }
    }
    if (!response.ok) {
        const envelope = z
            .object({ error: z.union([OpenAIHubOAuthServerErrorSchema, z.object({ code: OpenAIHubOAuthServerErrorSchema })]) })
            .safeParse(await response.json().catch(() => undefined));
        interaction.signal?.throwIfAborted();
        const oauthServerError = envelope.success
            ? typeof envelope.data.error === 'string'
                ? envelope.data.error
                : envelope.data.error.code
            : 'other';
        throw fail(`OpenAI Hub token exchange failed (HTTP ${response.status}, ${oauthServerError}). Start sign-in again.`, {
            loginStage: 'token_exchange',
            httpStatus: response.status,
            oauthServerError,
            durationMs: Date.now() - startedAt
        });
    }
    report({
        event: 'login',
        phase: 'completed',
        loginStage: 'token_exchange',
        httpStatus: response.status,
        durationMs: Date.now() - startedAt
    });
    let token: z.infer<typeof tokenSchema>;
    try {
        token = tokenSchema.parse(await response.json());
    } catch (error) {
        if (interaction.signal?.aborted) throw error;
        throw fail(
            'OpenAI Hub received an invalid token response.',
            { loginStage: 'token_response', httpStatus: response.status },
            oauthNetworkFailure(error instanceof Error ? error : undefined, 'oauth_response_invalid')
        );
    }
    try {
        const payload = token.access_token.split('.')[1];
        if (!payload) throw new Error('Missing account claim');
        const claims = claimsSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
        const credential = OAuthCredentialSchema.parse({
            type: 'oauth',
            access: token.access_token,
            refresh: token.refresh_token,
            expires: Date.now() + token.expires_in * 1000,
            accountId: claims['https://api.openai.com/auth'].chatgpt_account_id
        });
        report({ event: 'login', phase: 'completed', loginStage: 'account_claim' });
        return credential;
    } catch {
        throw fail('OpenAI Hub token response contains no valid ChatGPT account.', { loginStage: 'account_claim' });
    }
}
