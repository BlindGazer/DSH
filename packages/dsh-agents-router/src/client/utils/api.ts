import { PREFIX } from '../../shared/constants/constants.js';

export async function request<T = Record<string, string | number | boolean>>(route: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${PREFIX}${route}`, options);
    const body = (await response.json()) as Record<string, string | number | boolean>;
    if (!response.ok) {
        const errorMsg = typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }
    return body as T;
}
