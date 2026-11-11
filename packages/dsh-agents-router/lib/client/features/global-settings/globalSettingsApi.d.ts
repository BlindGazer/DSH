import type { GlobalSettings } from '../../../shared/models/RouterModels.js';
import { request } from '../../utils/api.js';
interface GlobalSettingsResponse {
    settings: GlobalSettings;
}
export interface GlobalSettingsApi {
    load(signal: AbortSignal): Promise<GlobalSettingsResponse>;
    save(settings: GlobalSettings, signal: AbortSignal): Promise<GlobalSettingsResponse>;
}
export declare function createGlobalSettingsApi(send?: typeof request): GlobalSettingsApi;
export declare const globalSettingsApi: GlobalSettingsApi;
export {};
