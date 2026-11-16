import type { DshClientContext, DshLocaleCode, DshLocaleService, DshSlotRegistrationOptions } from '@kalex/dsh-core';
import type { ReactElement } from 'react';
import { createElement, useSyncExternalStore } from 'react';
import { openAICodexLocaleDictionaries, translateOpenAICodex } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import type {
    ModelSettings,
    OpenAICodexSnapshot,
    ResetRequest,
    TYPERT_REMOTE,
    UiComponentId,
    UiRenderError
} from '../../../shared/remote.js';
import { CodexRenderErrorBoundary } from './CodexRenderErrorBoundary.js';

export interface OpenAICodexRemote {
    snapshot(): Promise<OpenAICodexSnapshot>;
    startLogin(): Promise<OpenAICodexSnapshot>;
    logout(): Promise<OpenAICodexSnapshot>;
    followHostProxy(): Promise<OpenAICodexSnapshot>;
    useSystemProxy(): Promise<OpenAICodexSnapshot>;
    consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot>;
    saveModels(models: ModelSettings): Promise<OpenAICodexSnapshot>;
    reportUiError(error: UiRenderError): Promise<true>;
    reportUiReady(componentId: UiComponentId): Promise<true>;
}

interface RemoteMountService {
    $mount(contribution: typeof TYPERT_REMOTE): Promise<() => Promise<void> | void>;
}

interface LocaleService extends DshLocaleService {
    register(namespace: string, dictionaries: typeof openAICodexLocaleDictionaries): () => void;
    bind(namespace: string): (key: string) => string;
}

export interface OpenAICodexClientContext extends DshClientContext {
    readonly remote: RemoteMountService;
    readonly locale: LocaleService;
    get(name: string): OpenAICodexRemote | undefined;
    effect(callback: () => undefined | (() => void), label?: string): void;
}

export interface CodexClientState {
    readonly status: 'loading' | 'ready' | 'error';
    readonly snapshot?: OpenAICodexSnapshot;
    readonly error?: string;
}

function unwrapRemoteSnapshot(value: unknown): OpenAICodexSnapshot {
    let current: unknown = value;
    for (let depth = 0; depth < 3; depth += 1) {
        if (current && typeof current === 'object' && 'ok' in current && 'value' in current) {
            current = (current as { value: unknown }).value;
            continue;
        }
        break;
    }
    if (!current || typeof current !== 'object' || !('status' in current)) {
        throw new Error(`Invalid OpenAI Codex snapshot response: ${JSON.stringify(value)}`);
    }
    return current as OpenAICodexSnapshot;
}

export class OpenAICodexController {
    private state: CodexClientState = { status: 'loading' };
    private readonly listeners = new Set<() => void>();
    private generation = 0;

    constructor(private readonly remote: OpenAICodexRemote) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = (): CodexClientState => this.state;

    private publish(state: CodexClientState): void {
        this.state = state;
        for (const listener of this.listeners) listener();
    }

    async load(background = false): Promise<void> {
        const generation = ++this.generation;
        if (!background && !this.state.snapshot) this.publish({ status: 'loading' });
        try {
            const rawSnapshot = await this.remote.snapshot();
            const snapshot = unwrapRemoteSnapshot(rawSnapshot);
            if (generation === this.generation) this.publish({ status: 'ready', snapshot });
        } catch {
            if (generation === this.generation) this.publish({ status: 'error', error: 'OpenAI Codex request failed' });
        }
    }

    private async act(action: () => Promise<OpenAICodexSnapshot>): Promise<OpenAICodexSnapshot> {
        const generation = ++this.generation;
        const snapshot = unwrapRemoteSnapshot(await action());
        if (generation === this.generation) this.publish({ status: 'ready', snapshot });
        return snapshot;
    }

    startLogin(): Promise<OpenAICodexSnapshot> {
        return this.act(() => this.remote.startLogin());
    }
    logout(): Promise<OpenAICodexSnapshot> {
        return this.act(() => this.remote.logout());
    }
    setHostProxy(): Promise<OpenAICodexSnapshot> {
        return this.act(() => this.remote.followHostProxy());
    }
    setSystemProxy(): Promise<OpenAICodexSnapshot> {
        return this.act(() => this.remote.useSystemProxy());
    }
    saveModels(models: ModelSettings): Promise<OpenAICodexSnapshot> {
        return this.act(() => this.remote.saveModels(models));
    }
    consumeReset(input: ResetRequest): Promise<OpenAICodexSnapshot> {
        return this.act(() => this.remote.consumeReset(input));
    }
}

export function useCodexState(controller: OpenAICodexController): CodexClientState {
    return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}

export function selectLocale(preference?: string): DshLocaleCode {
    return preference === 'ru' ? 'ru' : 'en';
}

export function translateFor(locale: DshLocaleCode, key: string): string {
    const allowed = new Set(Object.keys(openAICodexLocaleDictionaries.en));
    if (!allowed.has(key)) return key;
    return translateOpenAICodex(locale, key as keyof typeof openAICodexLocaleDictionaries.en);
}

export function registerCodexSlot<TProps extends object>(
    context: OpenAICodexClientContext,
    options: DshSlotRegistrationOptions,
    component: (props: TProps) => ReactElement | undefined,
    props: TProps,
    fallbackText: string,
    onError: (error: UiRenderError) => Promise<true>,
    onReady: (componentId: UiComponentId) => Promise<true>
): void {
    const componentId = options.id ?? options.name;
    const render = (slotProps: Record<string, string | undefined>) =>
        createElement(
            CodexRenderErrorBoundary,
            { fallbackText, componentId, onError, onReady },
            createElement<TProps>(component, { ...slotProps, ...props })
        );
    context.slots.inject(options.name, () => context.slots.register(options, render));
}

export {
    RemoteNamespace,
    ServiceKey
} from '../../../shared/constants/runtime.js';
