/**
 * Очищает введенный пользователем адрес узла от схемы (http://, https://), путей и портов.
 */
export declare function sanitizeHostInput(input: string): string;
/**
 * Извлекает нормализованный адрес хоста с нестандартным портом из URL-строки или возвращает null при ошибке.
 */
export declare function extractHost(rawUrl: string): string | null;
