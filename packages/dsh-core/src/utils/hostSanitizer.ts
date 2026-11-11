/**
 * Очищает введенный пользователем адрес узла от схемы (http://, https://), путей и портов.
 */
export function sanitizeHostInput(input: string): string {
    if (typeof input !== 'string') return '';
    let value = input.trim();
    if (value === '') return '';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
        try {
            return new URL(value).hostname.toLowerCase();
        } catch {
            value = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
        }
    }
    const firstSegment = value.split('/')[0] ?? value;
    value = firstSegment;
    if (value.includes(':')) {
        const ipv6Input = value.startsWith('[') ? value : `[${value}]`;
        try {
            const ipv6Host = new URL(`http://${ipv6Input}`).hostname;
            if (ipv6Host.includes(':')) return ipv6Host.toLowerCase();
        } catch {}
    }
    const colonIndex = value.indexOf(':');
    if (colonIndex > 0 && !value.startsWith('[')) {
        return value.slice(0, colonIndex).toLowerCase();
    }
    return value.toLowerCase();
}

/**
 * Извлекает нормализованный адрес хоста с нестандартным портом из URL-строки или возвращает null при ошибке.
 */
export function extractHost(rawUrl: string): string | null {
    if (typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    try {
        const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
        const parsed = new URL(withScheme);
        return parsed.host ? parsed.host.toLowerCase() : null;
    } catch {
        return null;
    }
}
