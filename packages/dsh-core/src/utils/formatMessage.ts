/**
 * Подставляет позиционные параметры {0}, {1}, ... в шаблон локализованной строки.
 */
export function formatMessage(template: string, ...args: ReadonlyArray<string | number>): string {
    return template.replace(/\{(\d+)\}/g, (match, indexStr: string) => {
        const idx = Number.parseInt(indexStr, 10);
        const replacement = args[idx];
        return replacement !== undefined ? String(replacement) : match;
    });
}
