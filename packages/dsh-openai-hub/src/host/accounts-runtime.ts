import type { Context } from '@deepseek-ai/cordis';
import type { ConfigEditor } from '@deepseek-ai/dsh-config-editor';
import type { z } from 'zod';
import { type AccountConfig, type AuthMethod, Config, reconcileModels } from '../shared/accounts.js';
import { credentialRefForAccount, PackageId } from '../shared/constants/runtime.js';
import type {
    AccountRequest,
    AccountSnapshot,
    LoginRequest,
    OpenAICodexSnapshot,
    ResetRequest,
    SaveModelsRequest,
    SubmitCallbackUrlRequest,
    UpdateAccountRequest
} from '../shared/remote.js';
import {
    AccountRequestSchema,
    LoginRequestSchema,
    ResetRequestSchema,
    SaveModelsRequestSchema,
    SnapshotSchema,
    SubmitCallbackUrlRequestSchema,
    UpdateAccountRequestSchema
} from '../shared/remote.js';
import { catalogForIds, localCatalog, mergeCatalog, requestCatalog } from './catalog.js';
import { AccountCredentials, type OAuthCredential, OAuthCredentialSchema } from './credentials.js';
import type { OpenAIHubLogging } from './logging.js';
import { type CodexModel, createCodexProvider } from './provider.js';
import { createResetRedeemer, requestResetCredits } from './reset-credits.js';
import { requestCodexUsage } from './usage.js';

interface LoginStatus {
    status: OpenAICodexSnapshot['status'];
    deviceCode: string;
    verificationUri: string;
    callbackUrlRequested: boolean;
    error: string;
}
interface LoginAttempt {
    controller: AbortController;
    accountLabel: string;
    authMethod: AuthMethod;
    cancelled: boolean;
    committing: boolean;
}
const loginAttempts = new WeakMap<Context, LoginAttempt>();
const loginStatuses = new WeakMap<Context, LoginStatus>();
export interface AccountRuntime {
    config: AccountConfig;
    catalog: CodexModel[];
    view: AccountSnapshot;
    active: boolean;
    redeem: ReturnType<typeof createResetRedeemer>;
    usageFlight?: Promise<void> | undefined;
    catalogFlight?: Promise<void> | undefined;
}
function runtime(config: AccountConfig): AccountRuntime {
    const catalog = config.catalogLoaded
        ? catalogForIds([...localCatalog().map(model => model.id), ...config.models.map(model => model.id)]).map(model => ({
              ...model,
              ...config.catalogMetadata.find(metadata => metadata.id === model.id)
          }))
        : localCatalog();
    const models = reconcileModels(
        config.models,
        catalog.map(model => model.id)
    );
    return {
        config: { ...config, models },
        catalog,
        active: true,
        redeem: createResetRedeemer(),
        view: {
            accountLabel: config.accountLabel,
            authMethod: config.authMethod,
            autoRefreshLimits: config.autoRefreshLimits,
            models,
            catalogStatus: config.catalogLoaded ? 'ready' : 'fallback',
            catalogError: '',
            loggedIn: false,
            expiresAt: 0,
            usageStatus: 'idle',
            usageLimited: false,
            usageLimits: [],
            usageCredits: '',
            usageCreditsUnlimited: false,
            resetCards: [],
            resetCardsStatus: 'idle',
            usageUpdatedAt: 0,
            usageError: ''
        }
    };
}
export class AccountsRuntime {
    readonly credentials: AccountCredentials;
    accounts: AccountRuntime[];
    private disposed = false;
    private mutation = Promise.resolve();
    private loginGeneration = 0;
    private loginController?: AbortController;
    private readonly login: LoginStatus;
    private submitManualCode: ((url: string) => void) | undefined;
    constructor(
        private readonly ctx: Context,
        config: z.infer<typeof Config>,
        private readonly logging: OpenAIHubLogging
    ) {
        this.credentials = new AccountCredentials(ctx);
        this.login = loginStatuses.get(ctx) ?? {
            status: 'idle',
            deviceCode: '',
            verificationUri: '',
            callbackUrlRequested: false,
            error: ''
        };
        loginStatuses.set(ctx, this.login);
        this.accounts = config.accounts.map(runtime);
        ctx.effect(
            () => () => {
                this.disposed = true;
                this.loginGeneration++;
                this.loginController?.abort();
                const attempt = loginAttempts.get(this.ctx);
                if (attempt && !attempt.committing) {
                    attempt.cancelled = true;
                    Object.assign(this.login, {
                        status: 'idle',
                        deviceCode: '',
                        verificationUri: '',
                        callbackUrlRequested: false,
                        error: ''
                    });
                }
                void this.logging.recordHost({ event: 'plugin', phase: 'stopped' });
            },
            'openai-hub: cancel stale operations'
        );
    }
    current(account: AccountRuntime, label = account.config.accountLabel): boolean {
        return !this.disposed && account.active && this.accounts.includes(account) && account.config.accountLabel === label;
    }
    find(label: string): AccountRuntime {
        const account = this.accounts.find(item => item.config.accountLabel === label && item.active);
        if (!account || this.disposed) throw new Error('Stale OpenAI Hub account; select a current model');
        return account;
    }
    private serialized<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.mutation.then(operation);
        this.mutation = result.then(
            () => undefined,
            () => undefined
        );
        return result;
    }
    private async persist(accounts: readonly AccountConfig[]): Promise<void> {
        const config = Config.parse({ accounts });
        const editor: ConfigEditor | undefined = this.ctx.get('configEditor');
        const entry = editor?.entries().find(row => row.options.name === PackageId);
        if (!editor || !entry) throw new Error('OpenAI Hub configuration cannot be saved');
        await editor.edit(entry, () => config);
    }
    private diagnostic(message: string): void {
        console.error(`[${PackageId}] ${message}`);
        this.ctx.logger.error(`[${PackageId}] ${message}`);
    }
    async snapshot(): Promise<OpenAICodexSnapshot> {
        for (const account of this.accounts) {
            const credential = await this.credentials.read(account.config);
            if (account.active) {
                account.view.loggedIn = Boolean(credential);
                account.view.expiresAt = credential?.expires ?? 0;
            }
        }
        return SnapshotSchema.parse({
            ...this.login,
            accounts: this.accounts
                .filter(account => account.active)
                .map(account => ({
                    ...account.view,
                    accountLabel: account.config.accountLabel,
                    autoRefreshLimits: account.config.autoRefreshLimits,
                    models: account.config.models
                }))
        });
    }
    async startLogin(input: LoginRequest): Promise<OpenAICodexSnapshot> {
        const request = LoginRequestSchema.parse(input);
        const existingAccount = this.accounts.find(account => account.config.accountLabel === request.accountLabel);
        if (existingAccount && !request.reauthenticate) throw new Error('Duplicate OpenAI Hub account label');
        if (request.reauthenticate && !existingAccount) throw new Error('OpenAI Hub account no longer exists');
        if (existingAccount && existingAccount.config.authMethod !== request.authMethod)
            throw new Error('OpenAI Hub account authentication method cannot be changed during sign-in');
        const previousAttempt = loginAttempts.get(this.ctx);
        if (previousAttempt) {
            previousAttempt.cancelled = true;
            previousAttempt.controller.abort();
        }
        this.loginController?.abort();
        const generation = ++this.loginGeneration;
        const controller = new AbortController();
        const attempt: LoginAttempt = {
            controller,
            accountLabel: request.accountLabel,
            authMethod: request.authMethod,
            cancelled: false,
            committing: false
        };
        loginAttempts.set(this.ctx, attempt);
        this.loginController = controller;
        Object.assign(this.login, { status: 'starting', deviceCode: '', verificationUri: '', callbackUrlRequested: false, error: '' });
        const oauth = createCodexProvider().auth.oauth;
        if (!oauth) throw new Error('OpenAI Hub OAuth unavailable');
        let notifyReady: (() => void) | undefined;
        const ready = new Promise<void>(resolve => {
            notifyReady = resolve;
        });
        const current = () => !this.disposed && !controller.signal.aborted && generation === this.loginGeneration;
        const operation = (async () => {
            try {
                const credential = OAuthCredentialSchema.parse(
                    await oauth.login({
                        signal: controller.signal,
                        notify: info => {
                            if (!current()) return;
                            if (info.type === 'device_code') {
                                const url = new URL(info.verificationUri);
                                if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com')
                                    throw new Error('Invalid OpenAI authorization URL');
                                Object.assign(this.login, {
                                    status: 'waiting',
                                    deviceCode: info.userCode,
                                    verificationUri: url.toString()
                                });
                                void this.logging.recordHost({
                                    event: 'login',
                                    phase: 'device_code_received',
                                    accountLabel: request.accountLabel,
                                    authMethod: request.authMethod
                                });
                                notifyReady?.();
                            } else if (info.type === 'auth_url') {
                                const url = new URL(info.url);
                                if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com')
                                    throw new Error('Invalid OpenAI authorization URL');
                                Object.assign(this.login, { status: 'waiting', deviceCode: '', verificationUri: url.toString() });
                                void this.logging.recordHost({
                                    event: 'login',
                                    phase: 'authorization_url_received',
                                    accountLabel: request.accountLabel,
                                    authMethod: request.authMethod
                                });
                                // Снимок возвращается после появления поля ручной вставки callback.
                            }
                        },
                        prompt: async prompt => {
                            if (prompt.type === 'select') return request.authMethod === 'device-code' ? 'device_code' : 'browser';
                            if (prompt.type === 'manual_code' && request.authMethod === 'browser-oauth') {
                                const signal = AbortSignal.any([
                                    controller.signal,
                                    ...(prompt.signal ? [prompt.signal] : []),
                                    AbortSignal.timeout(600000)
                                ]);
                                Object.assign(this.login, { status: 'waiting', callbackUrlRequested: true });
                                void this.logging.recordHost({ event: 'login', phase: 'waiting', authMethod: request.authMethod });
                                notifyReady?.();
                                return new Promise<string>((resolve, reject) => {
                                    const abort = () => {
                                        if (prompt.signal?.aborted && !controller.signal.aborted) {
                                            void this.logging.recordHost({
                                                event: 'login',
                                                phase: 'callback_received',
                                                accountLabel: request.accountLabel,
                                                authMethod: request.authMethod
                                            });
                                        }
                                        this.submitManualCode = undefined;
                                        Object.assign(this.login, { callbackUrlRequested: false });
                                        reject(new Error('OpenAI Hub browser authorization ended'));
                                    };
                                    this.submitManualCode = url => {
                                        signal.removeEventListener('abort', abort);
                                        this.submitManualCode = undefined;
                                        Object.assign(this.login, { callbackUrlRequested: false });
                                        resolve(url);
                                    };
                                    if (signal.aborted) abort();
                                    else signal.addEventListener('abort', abort, { once: true });
                                });
                            }
                            throw new Error('OpenAI Hub OAuth interaction unsupported');
                        }
                    })
                );
                await this.serialized(async () => {
                    if (!current()) return;
                    const previousConfig = existingAccount?.config;
                    const previousCredential = previousConfig ? await this.credentials.read(previousConfig) : undefined;
                    const config: AccountConfig = existingAccount
                        ? { ...existingAccount.config, credentialKey: credentialRefForAccount(request.authMethod, credential.accountId) }
                        : {
                              accountLabel: request.accountLabel,
                              authMethod: request.authMethod,
                              credentialKey: credentialRefForAccount(request.authMethod, credential.accountId),
                              autoRefreshLimits: false,
                              models: [],
                              catalogLoaded: false,
                              catalogMetadata: []
                          };
                    if (this.accounts.some(account => account !== existingAccount && account.config.credentialKey === config.credentialKey))
                        throw new Error('OpenAI Hub credential belongs to another account');
                    const previousTargetCredential =
                        config.credentialKey === previousConfig?.credentialKey ? previousCredential : await this.credentials.read(config);
                    await this.credentials.store(
                        config,
                        credential,
                        current,
                        Boolean(existingAccount && previousConfig?.credentialKey === config.credentialKey)
                    );
                    const previousAccounts = this.accounts.map(account => account.config);
                    attempt.committing = true;
                    try {
                        await this.persist(
                            this.accounts
                                .map(account => (account === existingAccount ? config : account.config))
                                .concat(existingAccount ? [] : [config])
                        );
                    } catch {
                        attempt.committing = false;
                        if (previousTargetCredential) await this.credentials.store(config, previousTargetCredential, () => true, true);
                        else await this.credentials.delete(config);
                        if (!attempt.cancelled && !current())
                            Object.assign(this.login, {
                                status: 'error',
                                deviceCode: '',
                                verificationUri: '',
                                callbackUrlRequested: false,
                                error: 'OpenAI Hub sign-in failed'
                            });
                        throw new Error('OpenAI Hub account could not be saved');
                    }
                    if (attempt.cancelled) {
                        attempt.committing = false;
                        let configRestored = true;
                        let credentialRestored = true;
                        try {
                            await this.persist(previousAccounts);
                        } catch {
                            configRestored = false;
                            this.diagnostic('Unable to restore account configuration after cancelled sign-in');
                        }
                        if (configRestored) {
                            try {
                                if (previousTargetCredential)
                                    await this.credentials.store(config, previousTargetCredential, () => true, true);
                                else await this.credentials.delete(config);
                            } catch {
                                credentialRestored = false;
                                this.diagnostic('Unable to restore account credential after cancelled sign-in');
                            }
                        } else {
                            credentialRestored = false;
                            this.diagnostic('Preserving the new credential because account configuration rollback failed');
                        }
                        Object.assign(this.login, {
                            status: configRestored && credentialRestored ? 'idle' : 'error',
                            deviceCode: '',
                            verificationUri: '',
                            callbackUrlRequested: false,
                            error:
                                configRestored && credentialRestored
                                    ? ''
                                    : 'OpenAI Hub sign-in could not be cancelled completely; the account may remain connected'
                        });
                        return;
                    }
                    attempt.committing = false;
                    if (loginAttempts.get(this.ctx) === attempt) loginAttempts.delete(this.ctx);
                    if (existingAccount) {
                        existingAccount.config = config;
                        existingAccount.view.loggedIn = true;
                        existingAccount.view.expiresAt = credential.expires;
                        existingAccount.view.usageStatus = 'idle';
                        existingAccount.view.usageError = '';
                        if (previousConfig && previousConfig.credentialKey !== config.credentialKey) {
                            try {
                                await this.credentials.delete(previousConfig);
                            } catch {
                                this.diagnostic('Unable to remove previous account credential after sign-in');
                            }
                        }
                    } else {
                        // Успешная запись уже могла remount-нуть Host; ответ обязан отражать сохраненный аккаунт.
                        const account = runtime(config);
                        this.accounts = [...this.accounts, account];
                        account.view.loggedIn = true;
                        account.view.expiresAt = credential.expires;
                    }
                    Object.assign(this.login, {
                        status: 'done',
                        deviceCode: '',
                        verificationUri: '',
                        callbackUrlRequested: false,
                        error: ''
                    });
                    await this.logging.recordHost({
                        event: 'login',
                        phase: 'completed',
                        state: 'done',
                        accountLabel: config.accountLabel,
                        authMethod: config.authMethod
                    });
                    if (!this.disposed) {
                        void this.refreshCatalog({ accountLabel: config.accountLabel }).catch(() => undefined);
                        if (existingAccount) void this.refreshUsage({ accountLabel: config.accountLabel }).catch(() => undefined);
                    }
                });
            } catch {
                if (current()) {
                    Object.assign(this.login, {
                        status: 'error',
                        deviceCode: '',
                        verificationUri: '',
                        callbackUrlRequested: false,
                        error: 'OpenAI Hub sign-in failed'
                    });
                    await this.logging.recordHost({
                        event: 'login',
                        phase: 'failed',
                        state: 'error',
                        errorCode: 'oauth_failed',
                        accountLabel: request.accountLabel,
                        authMethod: request.authMethod
                    });
                    this.diagnostic('Sign-in failed');
                }
            } finally {
                if (loginAttempts.get(this.ctx) === attempt) loginAttempts.delete(this.ctx);
                notifyReady?.();
            }
        })();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            await Promise.race([
                ready,
                operation,
                new Promise<void>(resolve => {
                    timer = setTimeout(resolve, 30000);
                })
            ]);
        } finally {
            if (timer) clearTimeout(timer);
        }
        return this.snapshot();
    }
    async cancelLogin(): Promise<OpenAICodexSnapshot> {
        const attempt = loginAttempts.get(this.ctx);
        if (attempt) {
            attempt.cancelled = true;
            attempt.controller.abort();
            this.loginGeneration++;
            this.loginController?.abort();
            delete this.loginController;
            this.submitManualCode = undefined;
            Object.assign(this.login, {
                status: 'idle',
                deviceCode: '',
                verificationUri: '',
                callbackUrlRequested: false,
                error: ''
            });
        }
        return this.snapshot();
    }
    async submitCallbackUrl(input: SubmitCallbackUrlRequest): Promise<OpenAICodexSnapshot> {
        const { url: rawUrl } = SubmitCallbackUrlRequestSchema.parse(input);
        let url: URL;
        try {
            url = new URL(rawUrl);
        } catch {
            throw new Error('Invalid OpenAI callback URL');
        }
        const parameters = [...url.searchParams.keys()];
        if (
            url.protocol !== 'http:' ||
            url.hostname !== 'localhost' ||
            url.port !== '1455' ||
            url.pathname !== '/auth/callback' ||
            url.username ||
            url.password ||
            url.hash ||
            !url.searchParams.get('code') ||
            !url.searchParams.get('state') ||
            parameters.length !== 2 ||
            new Set(parameters).size !== 2 ||
            !parameters.includes('code') ||
            !parameters.includes('state')
        )
            throw new Error('Invalid OpenAI callback URL');
        if (!this.login.callbackUrlRequested || !this.submitManualCode || this.disposed)
            throw new Error('OpenAI callback prompt is no longer active');
        const attempt = loginAttempts.get(this.ctx);
        if (attempt)
            void this.logging.recordHost({
                event: 'login',
                phase: 'callback_received',
                accountLabel: attempt.accountLabel,
                authMethod: attempt.authMethod
            });
        this.submitManualCode(rawUrl);
        return this.snapshot();
    }
    async updateAccount(input: UpdateAccountRequest): Promise<OpenAICodexSnapshot> {
        const request = UpdateAccountRequestSchema.parse(input);
        await this.serialized(async () => {
            const account = this.find(request.accountLabel);
            if (this.accounts.some(other => other !== account && other.config.accountLabel === request.newLabel))
                throw new Error('Duplicate OpenAI Hub account label');
            const next = { ...account.config, accountLabel: request.newLabel, autoRefreshLimits: request.autoRefreshLimits };
            await this.persist(this.accounts.map(other => (other === account ? next : other.config)));
            account.config = next;
        });
        return this.snapshot();
    }
    async saveModels(input: SaveModelsRequest): Promise<OpenAICodexSnapshot> {
        const request = SaveModelsRequestSchema.parse(input);
        await this.serialized(async () => {
            const account = this.find(request.accountLabel);
            const ids = new Set(account.catalog.map(model => model.id));
            const unique = new Set(request.models.map(model => model.id));
            if (
                request.models.length !== ids.size ||
                unique.size !== ids.size ||
                request.models.some(model => !ids.has(model.id) || !model.name.trim()) ||
                (ids.size && !request.models.some(model => model.enabled))
            )
                throw new Error('Invalid OpenAI Hub model settings');
            const next = { ...account.config, models: request.models.map(model => ({ ...model, name: model.name.trim() })) };
            await this.persist(this.accounts.map(other => (other === account ? next : other.config)));
            account.config = next;
        });
        return this.snapshot();
    }
    async deleteAccount(input: AccountRequest): Promise<OpenAICodexSnapshot> {
        const request = AccountRequestSchema.parse(input);
        await this.serialized(async () => {
            const account = this.find(request.accountLabel);
            let credential: OAuthCredential | undefined;
            const attempt = loginAttempts.get(this.ctx);
            if (attempt) {
                attempt.cancelled = true;
                attempt.controller.abort();
            }
            this.loginGeneration++;
            this.loginController?.abort();
            try {
                credential = await this.credentials.take(account.config, () => {
                    account.active = false;
                });
                await this.persist(this.accounts.filter(other => other !== account).map(other => other.config));
                this.accounts = this.accounts.filter(other => other !== account);
                Object.assign(this.login, { status: 'idle', deviceCode: '', verificationUri: '', callbackUrlRequested: false, error: '' });
            } catch {
                account.active = true;
                if (credential) await this.credentials.restoreIfMissing(account.config, credential);
                throw new Error('OpenAI Hub account deletion failed; retry');
            }
        });
        return this.snapshot();
    }
    async refreshCatalog(input: AccountRequest): Promise<OpenAICodexSnapshot> {
        const { accountLabel } = AccountRequestSchema.parse(input);
        const account = this.find(accountLabel);
        if (!account.catalogFlight) {
            void this.logging.recordHost({ event: 'catalog_refresh', phase: 'started', accountLabel });
            account.catalogFlight = (async () => {
                try {
                    const credential = await this.credentials.valid(account.config, () => this.current(account, accountLabel));
                    const remoteCatalog = await requestCatalog(credential, globalThis.fetch, diagnostic => {
                        void this.logging.recordHost({
                            event: 'catalog_refresh',
                            phase: 'completed',
                            operation: 'refreshCatalog',
                            endpoint: diagnostic.endpoint,
                            httpStatus: diagnostic.httpStatus,
                            responseShape: diagnostic.responseShape,
                            count: diagnostic.count,
                            requestJson: diagnostic.requestJson,
                            responseJson: diagnostic.responseJson
                        });
                    });
                    const catalog = mergeCatalog(remoteCatalog);
                    await this.serialized(async () => {
                        if (!this.current(account, accountLabel)) return;
                        const next = {
                            ...account.config,
                            models: reconcileModels(
                                account.config.models,
                                catalog.map(model => model.id)
                            ),
                            catalogLoaded: true,
                            catalogMetadata: catalog.map(model => ({
                                id: model.id,
                                contextWindow: model.contextWindow,
                                maxTokens: model.maxTokens
                            }))
                        };
                        await this.persist(this.accounts.map(other => (other === account ? next : other.config)));
                        account.config = next;
                        account.catalog = catalog;
                        account.view.catalogStatus = 'ready';
                        account.view.catalogError = '';
                    });
                    await this.logging.recordHost({ event: 'catalog_refresh', phase: 'completed', accountLabel });
                } catch {
                    if (this.current(account, accountLabel)) {
                        account.view.catalogStatus = 'error';
                        account.view.catalogError = 'OpenAI Hub catalog refresh failed; retained previous models';
                        await this.logging.recordHost({
                            event: 'catalog_refresh',
                            phase: 'failed',
                            errorCode: 'catalog_failed',
                            accountLabel
                        });
                        this.diagnostic('Catalog refresh failed');
                    }
                } finally {
                    account.catalogFlight = undefined;
                }
            })();
        }
        await account.catalogFlight;
        return this.snapshot();
    }
    async refreshUsage(input: AccountRequest): Promise<OpenAICodexSnapshot> {
        const { accountLabel } = AccountRequestSchema.parse(input);
        const account = this.find(accountLabel);
        if (!account.usageFlight) {
            void this.logging.recordHost({ event: 'usage_refresh', phase: 'started', accountLabel });
            account.usageFlight = (async () => {
                account.view.usageStatus = 'loading';
                try {
                    const credential = await this.credentials.valid(account.config, () => this.current(account, accountLabel));
                    const [usage, cards] = await Promise.allSettled([
                        requestCodexUsage(credential, globalThis.fetch, Date.now(), diagnostic => {
                            void this.logging.recordHost({
                                event: 'usage_refresh',
                                phase: 'completed',
                                operation: 'refreshUsage',
                                accountLabel,
                                requestJson: diagnostic.requestJson,
                                responseJson: diagnostic.responseJson
                            });
                        }),
                        requestResetCredits(credential)
                    ]);
                    if (!this.current(account, accountLabel)) return;
                    if (cards.status === 'fulfilled') {
                        account.view.resetCards = cards.value.cards;
                        account.view.usageResetCredits = cards.value.availableCount;
                        account.view.resetCardsStatus = 'ready';
                    } else {
                        account.view.resetCards = [];
                        account.view.resetCardsStatus = 'error';
                    }
                    if (usage.status !== 'fulfilled') throw new Error('Usage unavailable');
                    Object.assign(account.view, {
                        usageStatus: 'ready',
                        usageLimited: usage.value.limited,
                        usageLimits: usage.value.limits,
                        usageCredits: usage.value.credits.hasCredits ? usage.value.credits.balance : '',
                        usageCreditsUnlimited: usage.value.credits.unlimited,
                        usageUpdatedAt: Date.now(),
                        usageError: ''
                    });
                    await this.logging.recordHost({ event: 'usage_refresh', phase: 'completed', accountLabel });
                } catch {
                    if (this.current(account, accountLabel)) {
                        account.view.usageStatus = 'error';
                        account.view.usageError = 'OpenAI Hub usage refresh failed';
                        await this.logging.recordHost({ event: 'usage_refresh', phase: 'failed', errorCode: 'usage_failed', accountLabel });
                        this.diagnostic('Usage refresh failed');
                    }
                } finally {
                    account.usageFlight = undefined;
                }
            })();
        }
        await account.usageFlight;
        return this.snapshot();
    }
    async consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot> {
        const request = ResetRequestSchema.parse(input);
        const account = this.find(request.accountLabel);
        const credential = await this.credentials.valid(account.config, () => this.current(account, request.accountLabel));
        account.view.resetResult = await account.redeem(
            credential,
            { creditId: request.creditId, idempotencyKey: request.idempotencyKey, confirmed: true },
            globalThis.fetch,
            () => this.current(account, request.accountLabel)
        );
        if (this.current(account, request.accountLabel)) return this.refreshUsage({ accountLabel: request.accountLabel });
        return this.snapshot();
    }
}
