import type { BuiltinProviderEndpoint } from '../models/ProxyModels.js';
/**
 * Базовый URL HTTP API плагина внутри веб-сервера DSH.
 */
export declare const API_BASE = "/api/kalex-provider-proxy";
/**
 * Адрес по умолчанию для проверки работоспособности прокси-соединения.
 */
export declare const DEFAULT_TEST_URL = "https://generativelanguage.googleapis.com";
/**
 * Ключ хранения выбранного языка интерфейса плагина в localStorage.
 */
export declare const PROXY_LOCALE_KEY = "@kalex/dsh-proxy-provider/interface-language";
/**
 * Известные пространства имен настроек провайдеров в DSH.
 */
export declare const KNOWN_SETTINGS_NS: readonly string[];
/**
 * Встроенные конечные точки провайдеров моделей из @deepseek-ai/dsh-llm-pi-ai и ядра DSH.
 */
export declare const BUILTIN_PROVIDER_ENDPOINTS: Readonly<Record<string, BuiltinProviderEndpoint>>;
