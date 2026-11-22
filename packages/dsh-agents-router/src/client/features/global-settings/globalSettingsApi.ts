import type { GlobalSettings } from '../../../shared/models/RouterModels.ts';
import { request } from '../../utils/api.ts';

interface GlobalSettingsResponse {
    settings: GlobalSettings;
}

export interface GlobalSettingsApi {
    load(signal: AbortSignal): Promise<GlobalSettingsResponse>;
    save(settings: GlobalSettings, signal: AbortSignal): Promise<GlobalSettingsResponse>;
}

export function createGlobalSettingsApi(send: typeof request = request): GlobalSettingsApi {
    return {
        load: signal => send<GlobalSettingsResponse>('/global-settings', { headers: { accept: 'application/json' }, signal }),
        save: (settings, signal) =>
            send<GlobalSettingsResponse>('/global-settings', {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({ settings }),
                signal
            })
    };
}

export const globalSettingsApi = createGlobalSettingsApi();
