export const DuplicateAccountLoginError = 'account_already_connected';

export const OAuthFailureMessages = {
    oauth_connect_timeout: 'Establishing a connection for the OAuth request timed out; that connection returned no HTTP response.',
    oauth_dns_failed: 'DNS resolution failed for the OAuth connection to auth.openai.com.',
    oauth_connection_refused: 'The OAuth connection was refused.',
    oauth_connection_reset: 'The OAuth connection was reset.',
    oauth_tls_failed: 'TLS certificate verification failed for the OAuth connection.',
    oauth_headers_timeout: 'The OAuth connection did not return HTTP response headers in time.',
    oauth_body_timeout: 'Reading the OAuth response body timed out.',
    oauth_network_failed: 'The OAuth request to auth.openai.com failed; inspect the recorded exception types and codes.',
    oauth_http_failed: 'The OAuth endpoint returned an unsuccessful HTTP status.',
    oauth_response_invalid: 'The OAuth endpoint returned an invalid token response.',
    oauth_claim_invalid: 'The OAuth token contains no valid ChatGPT account claim.',
    oauth_callback_invalid: 'The callback does not match the current OAuth sign-in attempt.',
    oauth_internal_failed: 'OAuth sign-in failed outside the observed token exchange; no network cause was established.'
} as const;
