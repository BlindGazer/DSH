import type { BuiltinProviderEndpoint } from '../models/ProxyModels.js';

/**
 * Базовый URL HTTP API плагина внутри веб-сервера DSH.
 */
export const API_BASE = '/api/kalex-provider-proxy';

/**
 * Адрес по умолчанию для проверки работоспособности прокси-соединения.
 */
export const DEFAULT_TEST_URL = 'https://generativelanguage.googleapis.com';

/**
 * Ключ хранения выбранного языка интерфейса плагина в localStorage.
 */
export const PROXY_LOCALE_KEY = '@kalex/dsh-proxy-provider/interface-language';

/**
 * Известные пространства имен настроек провайдеров в DSH.
 */
export const KNOWN_SETTINGS_NS: readonly string[] = ['llm-pi-ai', 'llm-deepseek', 'llm-deepseek-account', 'llm-deepseek-api-key', ''];

/**
 * Встроенные конечные точки провайдеров моделей из @deepseek-ai/dsh-llm-pi-ai и ядра DSH.
 */
export const BUILTIN_PROVIDER_ENDPOINTS: Readonly<Record<string, BuiltinProviderEndpoint>> = Object.freeze({
    'deepseek-account': {
        name: 'DeepSeek Account',
        settingsNs: 'llm-deepseek-account',
        urls: ['https://api.deepseek.com']
    },
    'deepseek-official': {
        name: 'DeepSeek',
        settingsNs: 'llm-deepseek',
        urls: ['https://api.deepseek.com']
    },
    deepseek: {
        name: 'DeepSeek',
        settingsNs: 'llm-deepseek',
        urls: ['https://api.deepseek.com']
    },
    google: {
        name: 'google',
        settingsNs: 'llm-pi-ai',
        urls: ['https://generativelanguage.googleapis.com/v1beta']
    },
    openai: {
        name: 'OpenAI',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.openai.com/v1']
    },
    'openai-codex': {
        name: 'OpenAI Codex',
        settingsNs: 'llm-pi-ai',
        urls: ['https://chatgpt.com/backend-api', 'https://auth.openai.com']
    },
    anthropic: {
        name: 'Anthropic',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.anthropic.com']
    },
    openrouter: {
        name: 'OpenRouter',
        settingsNs: 'llm-pi-ai',
        urls: ['https://openrouter.ai/api/v1']
    },
    groq: {
        name: 'Groq',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.groq.com/openai/v1']
    },
    mistral: {
        name: 'Mistral',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.mistral.ai']
    },
    xai: {
        name: 'xAI',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.x.ai/v1']
    },
    cerebras: {
        name: 'Cerebras',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.cerebras.ai/v1']
    },
    fireworks: {
        name: 'Fireworks',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.fireworks.ai/inference']
    },
    'github-copilot': {
        name: 'GitHub Copilot',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.individual.githubcopilot.com']
    },
    huggingface: {
        name: 'HuggingFace',
        settingsNs: 'llm-pi-ai',
        urls: ['https://router.huggingface.co/v1']
    },
    'kimi-coding': {
        name: 'Kimi Coding',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.kimi.com/coding']
    },
    meta: {
        name: 'Meta',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.meta.ai/v1']
    },
    minimax: {
        name: 'MiniMax',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.minimax.io/anthropic']
    },
    'minimax-cn': {
        name: 'MiniMax CN',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.minimaxi.com/anthropic']
    },
    moonshotai: {
        name: 'Moonshot AI',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.moonshot.ai/v1']
    },
    'moonshotai-cn': {
        name: 'Moonshot AI CN',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.moonshot.cn/v1']
    },
    nvidia: {
        name: 'NVIDIA',
        settingsNs: 'llm-pi-ai',
        urls: ['https://integrate.api.nvidia.com/v1']
    },
    baseten: {
        name: 'Baseten',
        settingsNs: 'llm-pi-ai',
        urls: ['https://inference.baseten.co/v1']
    },
    'ant-ling': {
        name: 'Ant Ling',
        settingsNs: 'llm-pi-ai',
        urls: ['https://api.ant-ling.com/v1']
    },
    'qwen-token-plan': {
        name: 'Qwen Token Plan',
        settingsNs: 'llm-pi-ai',
        urls: ['https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1']
    }
});
