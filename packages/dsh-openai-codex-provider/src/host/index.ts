import type { Context } from '@deepseek-ai/cordis';
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials';
import { INVALID_CREDENTIAL_CODE, LlmError, resolveRetryPolicy } from '@deepseek-ai/dsh-llm';
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai';
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai';
import { defineTool } from '@deepseek-ai/dsh-tools';
import type { AuthContext, CredentialInfo as PiCredentialInfo, CredentialStore as PiCredentialStore } from '@earendil-works/pi-ai';
import { z } from 'zod';
import { CredentialRef, PackageId, ProviderRoute } from '../shared/constants/runtime.js';
import type { ModelChoice, ModelSettings, OpenAICodexSnapshot } from '../shared/remote.js';
import { createCodexProvider } from './provider.js';
import { createProxyManager } from './proxy-manager.js';
import type { OpenAICodexRemoteHandlers } from './remote-service.js';
import { OpenAICodexRemoteService } from './remote-service.js';
import type { ResetRequest } from './reset-credits.js';
import { createResetRedeemer, requestResetCredits } from './reset-credits.js';
import { SYSTEM_PROXY_ERROR } from './system-proxy.js';
import { requestCodexUsage } from './usage.js';

const Config = z.object({
    proxyMode: z.enum(['host', 'system']).default('host'),
    disabledModels: z.array(z.string()).default([]),
    modelSettings: z.array(z.object({ id: z.string(), name: z.string(), enabled: z.boolean() })).default([])
});

const PROVIDER = ProviderRoute;
const OAUTH_REF = credentialRef(CredentialRef);
const OAuthCredentialSchema = z
    .object({
        type: z.literal('oauth'),
        access: z.string().min(1),
        refresh: z.string().min(1),
        expires: z.number().finite(),
        accountId: z.string().min(1)
    })
    .passthrough();
const DEVICE_CODE_TIMEOUT_MS = 30000;
const REFRESH_LEEWAY_MS = 60000;
const USAGE_CACHE_MS = 60000;
const PI_PROVIDER = createCodexProvider();
const MODEL_CATALOG = PI_PROVIDER.getModels().map(({ id, name }) => ({ id, name }));
const MODEL_IDS = new Set(MODEL_CATALOG.map(({ id }) => id));
const CODEX_OAUTH = PI_PROVIDER.auth.oauth;

type ProxyMode = 'host' | 'system';
type OAuthCredential = z.infer<typeof OAuthCredentialSchema>;
interface DeviceChallenge {
    deviceCode: string;
    verificationUri: string;
}
interface Flow {
    controller: AbortController;
    generation: number;
}
interface UsageFlight {
    generation: number;
    promise: Promise<void>;
}

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
    reject(reason: Error): void;
}

function createDeferred<T>(): Deferred<T> {
    let resolvePromise: ((value: T) => void) | undefined;
    let rejectPromise: ((reason?: Error) => void) | undefined;
    const promise = new Promise<T>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    return {
        promise,
        resolve(value) {
            resolvePromise?.(value);
        },
        reject(reason) {
            rejectPromise?.(reason);
        }
    };
}
interface SettingsForm {
    ns: string;
    revision: number;
}
interface RuntimeState {
    status: OpenAICodexSnapshot['status'];
    loggedIn: boolean;
    deviceCode: string;
    verificationUri: string;
    expiresAt: number;
    error: string;
    usageStatus: OpenAICodexSnapshot['usageStatus'];
    usageLimited: boolean;
    usageLimits: OpenAICodexSnapshot['usageLimits'];
    usageCredits: string;
    usageCreditsUnlimited: boolean;
    usageResetCredits: number | undefined;
    resetCards: NonNullable<OpenAICodexSnapshot['resetCards']>;
    resetCardsStatus: NonNullable<OpenAICodexSnapshot['resetCardsStatus']>;
    usageUpdatedAt: number;
    usageError: string;
}

function initialModelSettings(saved: readonly ModelChoice[], legacyDisabled: readonly string[]): ModelChoice[] {
    const disabled = new Set(legacyDisabled.filter(id => MODEL_IDS.has(id)));
    const seen = new Set<string>();
    const result = saved.flatMap(entry => {
        if (!MODEL_IDS.has(entry.id) || seen.has(entry.id)) return [];
        const name = entry.name.trim().slice(0, 200);
        if (!name) return [];
        seen.add(entry.id);
        return [{ id: entry.id, name, enabled: entry.enabled }];
    });
    for (const model of MODEL_CATALOG) if (!seen.has(model.id)) result.push({ ...model, enabled: !disabled.has(model.id) });
    const first = result[0];
    if (first && !result.some(item => item.enabled)) result[0] = { ...first, enabled: true };
    return result;
}

function normalizeModels(models: ModelSettings): ModelChoice[] {
    if (models.length !== MODEL_CATALOG.length) throw new Error('Invalid Codex model selection');
    const seen = new Set<string>();
    const normalized = models.map(model => {
        const name = model.name.trim();
        if (!MODEL_IDS.has(model.id) || seen.has(model.id) || !name || name.length > 200) throw new Error('Invalid Codex model selection');
        seen.add(model.id);
        return { id: model.id, name, enabled: model.enabled };
    });
    if (seen.size !== MODEL_IDS.size || !normalized.some(model => model.enabled))
        throw new Error('At least one Codex model must remain enabled');
    return normalized;
}

function safeError(value: Error | string | undefined, fallback: string): string {
    const message = value instanceof Error ? value.message : (value ?? '');
    return [
        SYSTEM_PROXY_ERROR,
        'OpenAI Codex is not signed in',
        'OpenAI device-code response did not include a verification URL',
        'OpenAI device-code response included an invalid verification URL',
        'OpenAI device-code response included an untrusted verification URL'
    ].includes(message)
        ? message
        : fallback;
}

function verificationUri(value: string): string {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error('OpenAI device-code response included an invalid verification URL');
    }
    if (url.protocol !== 'https:' || url.hostname !== 'auth.openai.com')
        throw new Error('OpenAI device-code response included an untrusted verification URL');
    return url.toString();
}

function text(value: string) {
    return [{ type: 'text' as const, text: value }];
}

function createPiAuth(ctx: Context): {
    credentials: PiCredentialStore;
    authContext: AuthContext;
    readCredential(): Promise<OAuthCredential | undefined>;
    storeCredential(credential: OAuthCredential, current: () => boolean): Promise<boolean>;
    clearCredential(): Promise<void>;
} {
    let writes = Promise.resolve();
    const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
        const result = writes.then(operation);
        writes = result.then(
            () => undefined,
            () => undefined
        );
        return result;
    };
    const read = async (): Promise<OAuthCredential | undefined> => {
        const resolved = await ctx.credentials.resolve(OAUTH_REF);
        if (!resolved) return undefined;
        try {
            const parsed = OAuthCredentialSchema.safeParse(JSON.parse(resolved.value));
            return parsed.success ? parsed.data : undefined;
        } catch {
            return undefined;
        }
    };
    const credentials: PiCredentialStore = {
        async read(providerId) {
            return providerId === PROVIDER ? read() : undefined;
        },
        async list(): Promise<readonly PiCredentialInfo[]> {
            return (await read()) ? [{ providerId: PROVIDER, type: 'oauth' }] : [];
        },
        async modify(providerId, mutate) {
            if (providerId !== PROVIDER) return undefined;
            return serialize(async () => {
                const current = await read();
                const next = await mutate(current);
                if (!next) return current;
                const parsed = OAuthCredentialSchema.safeParse(next);
                if (!parsed.success) throw new Error('Invalid OpenAI Codex OAuth credential');
                await ctx.credentials.set(OAUTH_REF, JSON.stringify(parsed.data));
                return parsed.data;
            });
        },
        async delete(providerId) {
            if (providerId === PROVIDER) await serialize(async () => ctx.credentials.unset(OAUTH_REF));
        }
    };
    const authContext: AuthContext = {
        async env(name) {
            return isCredentialRefName(name) ? (await ctx.credentials.resolve(credentialRef(name)))?.value : undefined;
        },
        async fileExists() {
            return false;
        }
    };
    return {
        credentials,
        authContext,
        readCredential: read,
        async storeCredential(credential, current) {
            return serialize(async () => {
                if (!current()) return false;
                const parsed = OAuthCredentialSchema.parse(credential);
                await ctx.credentials.set(OAUTH_REF, JSON.stringify(parsed));
                return current();
            });
        },
        async clearCredential() {
            await serialize(async () => ctx.credentials.unset(OAUTH_REF));
        }
    };
}

/** Запускает Cordis-плагин и хранит OAuth только в локальном Credential Store. */
export class OpenAICodexAuthService {
    static inject = ['llm', 'credentials', 'settings', 'tools'];
    static Config = Config;
    static name = PackageId;

    constructor(ctx: Context, config: z.infer<typeof Config> = Config.parse({})) {
        this.configure(ctx, config);
    }

    private configure(ctx: Context, config: z.infer<typeof Config>): void {
        if (!CODEX_OAUTH) throw new Error('pi-ai OpenAI Codex provider does not expose OAuth');
        let settings = initialModelSettings(config.modelSettings, config.disabledModels);
        const hostOAuth = {
            async login(interaction: object): Promise<object> {
                return CODEX_OAUTH.login(interaction as Parameters<typeof CODEX_OAUTH.login>[0]);
            },
            async refresh(credential: object | undefined): Promise<object> {
                if (!credential) throw new Error('OpenAI Codex credential is unavailable');
                return CODEX_OAUTH.refresh(OAuthCredentialSchema.parse(credential), new AbortController().signal);
            }
        };
        const network = createProxyManager(config.proxyMode, hostOAuth);
        const redeemReset = createResetRedeemer();
        const oauth = {
            async login(interaction: object): Promise<OAuthCredential> {
                const lease = network.acquire();
                try {
                    return OAuthCredentialSchema.parse(await lease.oauth('login', undefined, interaction));
                } finally {
                    lease.release();
                }
            },
            async refresh(credential: OAuthCredential): Promise<OAuthCredential> {
                const lease = network.acquire();
                try {
                    return OAuthCredentialSchema.parse(await lease.oauth('refresh', credential, {}));
                } finally {
                    lease.release();
                }
            }
        };
        const profiles = (): Map<string, ResolvedPiAiProviderProfile> =>
            new Map([
                [
                    PROVIDER,
                    {
                        provider: PROVIDER,
                        displayName: 'OpenAI Codex',
                        reasoning: 'medium',
                        streamIdleTimeoutMs: 300000,
                        maxRequestImageBytes: 20971520,
                        maxRequestImages: 50,
                        imageOffloadCountQuantum: 10,
                        requestImagePixelBudget: 4194304,
                        requestImageMaxBytes: 1048576,
                        retryPolicy: resolveRetryPolicy(undefined, 'openai-codex-auth.retryPolicy'),
                        piProvider: createCodexProvider(() => {
                            const lease = network.acquire();
                            return {
                                options: lease.mode === 'system' ? { fetch: lease.fetch, transport: 'sse' } : {},
                                release: lease.release
                            };
                        }, settings),
                        modelErrors: new Map(),
                        configuredMaxTokens: new Map()
                    }
                ]
            ]);
        let currentProfiles = profiles();
        ctx.effect(() => () => network.dispose(), 'openai-codex-auth: dispose proxy transports');
        const state: RuntimeState = {
            status: 'idle',
            loggedIn: false,
            deviceCode: '',
            verificationUri: '',
            expiresAt: 0,
            error: '',
            usageStatus: 'idle',
            usageLimited: false,
            usageLimits: [],
            usageCredits: '',
            usageCreditsUnlimited: false,
            usageResetCredits: undefined,
            resetCards: [],
            resetCardsStatus: 'idle',
            usageUpdatedAt: 0,
            usageError: ''
        };
        let flow: Flow | undefined;
        let flowGeneration = 0;
        let credentialRevision = 0;
        let refreshFlight: Promise<OAuthCredential> | undefined;
        let usageFlight: UsageFlight | undefined;
        let usageGeneration = 0;
        let settingsMutation = Promise.resolve();
        const authInjection = createPiAuth(ctx);
        const clearUsage = () => {
            usageGeneration++;
            Object.assign(state, {
                usageStatus: 'idle',
                usageLimited: false,
                usageLimits: [],
                usageCredits: '',
                usageCreditsUnlimited: false,
                usageResetCredits: undefined,
                resetCards: [],
                resetCardsStatus: 'idle',
                usageUpdatedAt: 0,
                usageError: ''
            });
        };
        const snapshot = (): OpenAICodexSnapshot => ({
            proxyMode: network.mode,
            models: settings.map(model => ({ ...model })),
            proxyRestartRequired: false,
            proxyError: network.error,
            status: state.status,
            loggedIn: state.loggedIn,
            deviceCode: state.deviceCode,
            verificationUri: state.verificationUri,
            expiresAt: state.expiresAt,
            error: state.error,
            usageStatus: state.usageStatus,
            usageLimited: state.usageLimited,
            usageLimits: state.usageLimits.map(item => ({ ...item })),
            usageCredits: state.usageCredits,
            usageCreditsUnlimited: state.usageCreditsUnlimited,
            ...(state.usageResetCredits === undefined ? {} : { usageResetCredits: state.usageResetCredits }),
            resetCards: state.resetCards.map(card => ({ ...card })),
            resetCardsStatus: state.resetCardsStatus,
            usageUpdatedAt: state.usageUpdatedAt,
            usageError: state.usageError
        });
        const readCredential = authInjection.readCredential;
        const storeCredential = authInjection.storeCredential;
        const clearCredential = authInjection.clearCredential;
        const validCredential = async (): Promise<OAuthCredential | undefined> => {
            const credential = await readCredential();
            if (!credential) return undefined;
            if (Date.now() + REFRESH_LEEWAY_MS < credential.expires) return credential;
            if (!refreshFlight) {
                const revision = credentialRevision;
                refreshFlight = oauth
                    .refresh(credential)
                    .then(async refreshed => {
                        const existing = await readCredential();
                        if (
                            revision !== credentialRevision ||
                            existing?.accountId !== credential.accountId ||
                            !(await storeCredential(refreshed, () => revision === credentialRevision))
                        )
                            throw new Error('credential changed during refresh');
                        state.loggedIn = true;
                        state.expiresAt = refreshed.expires;
                        return refreshed;
                    })
                    .finally(() => {
                        refreshFlight = undefined;
                    });
            }
            return refreshFlight;
        };
        const refreshUsage = async (force = false): Promise<void> => {
            const generation = usageGeneration;
            if (usageFlight?.generation === generation) return usageFlight.promise;
            if (!force && ['ready', 'error'].includes(state.usageStatus) && Date.now() - state.usageUpdatedAt < USAGE_CACHE_MS) return;
            state.usageStatus = 'loading';
            state.usageError = '';
            state.resetCardsStatus = 'loading';
            const promise = (async () => {
                try {
                    const credential = await validCredential();
                    if (!credential) throw new Error('OpenAI Codex is not signed in');
                    if (generation !== usageGeneration) return;
                    const lease = network.acquire();
                    let usageResult: PromiseSettledResult<Awaited<ReturnType<typeof requestCodexUsage>>>;
                    let cardsResult: PromiseSettledResult<Awaited<ReturnType<typeof requestResetCredits>>>;
                    try {
                        [usageResult, cardsResult] = await Promise.allSettled([
                            requestCodexUsage(credential, lease.fetch),
                            requestResetCredits(credential, lease.fetch)
                        ]);
                    } finally {
                        lease.release();
                    }
                    if (generation !== usageGeneration) return;
                    if (cardsResult.status === 'fulfilled') {
                        state.resetCards = cardsResult.value.cards;
                        state.resetCardsStatus = 'ready';
                        state.usageResetCredits = cardsResult.value.availableCount;
                    } else {
                        state.resetCards = [];
                        state.resetCardsStatus = 'error';
                    }
                    if (usageResult.status === 'rejected') throw usageResult.reason;
                    state.usageStatus = 'ready';
                    state.usageLimited = usageResult.value.limited;
                    state.usageLimits = usageResult.value.limits;
                    state.usageCredits = usageResult.value.credits.hasCredits ? usageResult.value.credits.balance : '';
                    state.usageCreditsUnlimited = usageResult.value.credits.unlimited;
                    state.usageResetCredits =
                        cardsResult.status === 'fulfilled' ? cardsResult.value.availableCount : usageResult.value.resetCredits;
                    state.usageUpdatedAt = Date.now();
                    state.usageError = '';
                } catch (error) {
                    if (generation === usageGeneration) {
                        state.usageStatus = 'error';
                        state.resetCardsStatus = state.resetCardsStatus === 'loading' ? 'error' : state.resetCardsStatus;
                        state.usageUpdatedAt = Date.now();
                        state.usageError = safeError(error instanceof Error ? error : undefined, 'Unable to load OpenAI Codex usage.');
                    }
                    throw error;
                }
            })();
            const flight: UsageFlight = {
                generation,
                promise: promise.finally(() => {
                    if (usageFlight?.generation === generation) usageFlight = undefined;
                })
            };
            usageFlight = flight;
            return flight.promise;
        };
        const getSnapshot = async (refresh = true): Promise<OpenAICodexSnapshot> => {
            const revision = credentialRevision;
            await network.ready;
            try {
                const credential = await validCredential();
                if (revision !== credentialRevision) return snapshot();
                if (!credential) {
                    state.loggedIn = false;
                    state.expiresAt = 0;
                    if (!flow && state.status === 'done') state.status = 'idle';
                } else {
                    state.loggedIn = true;
                    state.expiresAt = credential.expires;
                    if (!flow) {
                        state.status = 'done';
                        state.error = '';
                    }
                    if (refresh) void refreshUsage().catch(() => undefined);
                }
            } catch (error) {
                if (revision === credentialRevision && !flow) {
                    state.status = 'error';
                    state.loggedIn = false;
                    state.error = safeError(error instanceof Error ? error : undefined, 'Unable to refresh OpenAI Codex sign-in.');
                }
            }
            return snapshot();
        };
        const adapter = new PiAiAdapter({
            profiles: () => currentProfiles,
            auth: authInjection,
            async resolveApiKey() {
                const credential = await validCredential();
                if (!credential)
                    throw new LlmError('OpenAI Codex is not signed in. Open Settings and sign in first.', INVALID_CREDENTIAL_CODE);
                return credential.access;
            },
            resolveAttachments: () => ctx.get('attachments')
        });
        const registration = ctx.llm.registerAdapter([PROVIDER], adapter);
        const startFlow = (): Promise<DeviceChallenge> => {
            flow?.controller.abort('new login requested');
            const generation = ++flowGeneration;
            const controller = new AbortController();
            const deferredDevice = createDeferred<DeviceChallenge>();
            const device = deferredDevice.promise;
            clearUsage();
            state.deviceCode = '';
            state.verificationUri = '';
            state.error = '';
            state.status = 'starting';
            const current: Flow = { controller, generation };
            flow = current;
            void (async () => {
                try {
                    const credential = await oauth.login({
                        signal: controller.signal,
                        notify(info: { type?: string; userCode?: string; verificationUri?: string }) {
                            if (info.type !== 'device_code' || !info.userCode || !info.verificationUri) return;
                            const challenge = { deviceCode: info.userCode, verificationUri: verificationUri(info.verificationUri) };
                            deferredDevice.resolve(challenge);
                            state.status = 'waiting';
                            state.deviceCode = challenge.deviceCode;
                            state.verificationUri = challenge.verificationUri;
                        },
                        async prompt(request: { type?: string }) {
                            if (request.type === 'select') return 'device_code';
                            throw new Error(`${PackageId}: unexpected OAuth prompt`);
                        }
                    });
                    if (generation !== flowGeneration || controller.signal.aborted) throw new Error('login cancelled');
                    const revision = ++credentialRevision;
                    const stored = await storeCredential(
                        credential,
                        () => generation === flowGeneration && revision === credentialRevision && !controller.signal.aborted
                    );
                    if (!stored || generation !== flowGeneration || revision !== credentialRevision || controller.signal.aborted)
                        throw new Error('login cancelled while storing credentials');
                    state.deviceCode = '';
                    state.verificationUri = '';
                    state.status = 'done';
                    state.loggedIn = true;
                    state.expiresAt = credential.expires;
                    void refreshUsage(true).catch(() => undefined);
                } catch (error) {
                    const message = safeError(error instanceof Error ? error : undefined, 'Unable to complete OpenAI Codex sign-in.');
                    deferredDevice.reject(new Error(message));
                    if (generation === flowGeneration) {
                        state.deviceCode = '';
                        state.verificationUri = '';
                        state.status = controller.signal.aborted ? 'idle' : 'error';
                        state.error = controller.signal.aborted ? '' : message;
                    }
                } finally {
                    if (flow === current) flow = undefined;
                }
            })();
            return device;
        };
        const logout = async (): Promise<void> => {
            flowGeneration++;
            credentialRevision++;
            flow?.controller.abort('logout requested');
            flow = undefined;
            await clearCredential();
            clearUsage();
            Object.assign(state, { status: 'idle', loggedIn: false, deviceCode: '', verificationUri: '', expiresAt: 0, error: '' });
        };
        const saveModels = (models: ModelSettings): Promise<void> => {
            const change = settingsMutation
                .catch(() => undefined)
                .then(async () => {
                    const next = normalizeModels(models);
                    const settingsService = ctx.get('settings');
                    const forms = settingsService?.describe().filter((entry: SettingsForm) => /(?:^|:)openai-codex-auth$/.test(entry.ns));
                    if (!settingsService?.writable || forms?.length !== 1 || !forms[0]) throw new Error('Unavailable settings');
                    await settingsService.update(
                        forms[0].ns,
                        {
                            proxyMode: network.mode,
                            disabledModels: next.filter(item => !item.enabled).map(item => item.id),
                            modelSettings: next
                        },
                        forms[0].revision
                    );
                    settings = next;
                    currentProfiles = profiles();
                    registration.replace([PROVIDER]);
                });
            settingsMutation = change;
            return change;
        };
        const selectProxy = async (mode: ProxyMode): Promise<void> => {
            const change = settingsMutation
                .catch(() => undefined)
                .then(async () => {
                    let candidate: Awaited<ReturnType<typeof network.prepare>> | undefined;
                    try {
                        const settingsService = ctx.get('settings');
                        const forms = settingsService
                            ?.describe()
                            .filter((entry: SettingsForm) => /(?:^|:)openai-codex-auth$/.test(entry.ns));
                        if (!settingsService?.writable || forms?.length !== 1 || !forms[0]) throw new Error('Unavailable settings');
                        candidate = await network.prepare(mode);
                        await settingsService.update(
                            forms[0].ns,
                            {
                                proxyMode: mode,
                                disabledModels: settings.filter(item => !item.enabled).map(item => item.id),
                                modelSettings: settings
                            },
                            forms[0].revision
                        );
                        network.commit(candidate);
                        clearUsage();
                        if (state.loggedIn) void refreshUsage(true).catch(() => undefined);
                    } catch (error) {
                        if (candidate) network.discard(candidate);
                        throw new Error(safeError(error instanceof Error ? error : undefined, 'Unable to save Codex proxy settings.'), {
                            cause: error
                        });
                    }
                });
            settingsMutation = change;
            return change;
        };
        ctx.effect(
            () => () => {
                flowGeneration++;
                credentialRevision++;
                flow?.controller.abort('plugin disposed');
            },
            'openai-codex-auth: abort login on dispose'
        );
        const handlers: OpenAICodexRemoteHandlers = {
            snapshot: () => getSnapshot(),
            async startLogin() {
                void startFlow().catch(() => undefined);
                return getSnapshot(false);
            },
            async logout() {
                await logout();
                return getSnapshot(false);
            },
            async followHostProxy() {
                await selectProxy('host');
                return snapshot();
            },
            async useSystemProxy() {
                await selectProxy('system');
                return snapshot();
            },
            async saveModels(models) {
                await saveModels(models);
                return snapshot();
            },
            async consumeReset(input) {
                const revision = credentialRevision;
                const credential = await validCredential();
                if (!credential || revision !== credentialRevision) return { ...snapshot(), resetResult: 'account_changed' };
                const lease = network.acquire();
                let resetResult: Awaited<ReturnType<typeof redeemReset>>;
                try {
                    resetResult = await redeemReset(credential, input as ResetRequest, lease.fetch, () => revision === credentialRevision);
                } finally {
                    lease.release();
                }
                if (revision === credentialRevision) {
                    clearUsage();
                    await refreshUsage(true).catch(() => undefined);
                }
                return { ...snapshot(), resetResult };
            }
        };
        // Конструктор Cordis регистрирует Remote-сервис в контексте.
        void new OpenAICodexRemoteService(ctx, handlers);
        this.registerTools(ctx, startFlow, getSnapshot, logout);
    }

    private registerTools(
        ctx: Context,
        startFlow: () => Promise<DeviceChallenge>,
        getSnapshot: (refresh?: boolean) => Promise<OpenAICodexSnapshot>,
        logout: () => Promise<void>
    ): void {
        ctx.tools.register(
            defineTool({
                name: 'codex_login',
                description: 'Start OpenAI Codex device-code sign-in. Give the code and URL to the user.',
                parameters: {},
                output: { schema: { type: 'string' }, render: (_args, value: string) => text(value) },
                async execute() {
                    let timer: ReturnType<typeof setTimeout> | undefined;
                    try {
                        const timeout = new Promise<DeviceChallenge>((_resolve, reject) => {
                            timer = setTimeout(() => reject(new Error('timed out waiting for device code')), DEVICE_CODE_TIMEOUT_MS);
                        });
                        const challenge = await Promise.race([startFlow(), timeout]);
                        return `Device code: ${challenge.deviceCode}\nVerification URL: ${challenge.verificationUri}\nComplete authorization, then call codex_status.`;
                    } catch (error) {
                        return `Login did not start: ${safeError(error instanceof Error ? error : undefined, 'Retry OpenAI Codex sign-in.')}`;
                    } finally {
                        if (timer) clearTimeout(timer);
                    }
                }
            })
        );
        ctx.tools.register(
            defineTool({
                name: 'codex_status',
                description: 'Report OpenAI Codex sign-in state and refresh expired credentials.',
                parameters: {},
                output: { schema: { type: 'string' }, render: (_args, value: string) => text(value) },
                async execute() {
                    const current = await getSnapshot();
                    if (!current.loggedIn)
                        return current.status === 'error'
                            ? `Sign-in failed: ${current.error}`
                            : current.status === 'waiting' || current.status === 'starting'
                              ? `Sign-in in progress. Code: ${current.deviceCode || '(pending)'}. URL: ${current.verificationUri || '(pending)'}.`
                              : 'Not signed in. Call codex_login.';
                    return `Signed in. Token expires ${new Date(current.expiresAt).toLocaleString()}; refresh is automatic.`;
                }
            })
        );
        ctx.tools.register(
            defineTool({
                name: 'codex_logout',
                description: 'Sign out by deleting the local OpenAI Codex OAuth credential.',
                parameters: {},
                output: { schema: { type: 'string' }, render: (_args, value: string) => text(value) },
                async execute() {
                    try {
                        await logout();
                        return 'Signed out of OpenAI Codex.';
                    } catch (error) {
                        return `Sign-out failed: ${safeError(error instanceof Error ? error : undefined, 'Unable to clear local credential.')}`;
                    }
                }
            })
        );
    }
}

export { Config };
export const name = PackageId;
export const inject = OpenAICodexAuthService.inject;
export default OpenAICodexAuthService;
