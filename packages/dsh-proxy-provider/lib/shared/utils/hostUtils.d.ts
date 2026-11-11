import { extractHost, sanitizeHostInput } from '@kalex/dsh-core/utils/hostSanitizer.js';
import type { ProfileDraft, ProxyProfile, SanitizedProxyProfile } from '../models/ProxyModels.js';
export { extractHost, sanitizeHostInput };
/**
 * Возвращает список хостов для идентификатора провайдера и необязательного пользовательского baseUrl.
 */
export declare function resolveProviderHosts(providerId: string, customBaseUrl?: string): string[];
/**
 * Создает пустой черновик профиля прокси для формы добавления.
 */
export declare function createEmptyDraft(): ProfileDraft;
/**
 * Преобразует сохраненный профиль прокси в черновик для редактирования.
 */
export declare function draftFromProfile(profile: SanitizedProxyProfile): ProfileDraft;
/**
 * Преобразует черновик формы в структуру профиля прокси для сохранения или проверки.
 */
export declare function profileFromDraft(draft: ProfileDraft): ProxyProfile;
