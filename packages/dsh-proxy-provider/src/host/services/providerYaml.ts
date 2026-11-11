export interface ParsedYamlProvider {
    baseURL?: string;
    displayName?: string;
}

/**
 * Разбирает секцию llm-pi-ai из файла cordis.patch.yml для обнаружения пользовательских провайдеров.
 */
export function parseProvidersFromPatchYaml(yamlText: string): Record<string, ParsedYamlProvider> {
    const result: Record<string, ParsedYamlProvider> = {};
    if (typeof yamlText !== 'string' || !yamlText.includes('llm-pi-ai')) return result;
    const lines = yamlText.split(/\r?\n/);
    let inPiAi = false;
    let inProviders = false;
    let providersIndent = -1;
    let currentProvider: string | null = null;
    let providerIndent = -1;

    for (const rawLine of lines) {
        if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
        const indent = rawLine.search(/\S/);
        const trimmed = rawLine.trim();

        if (trimmed.startsWith('- id:')) {
            inPiAi = trimmed.includes('llm-pi-ai');
            inProviders = false;
            currentProvider = null;
            continue;
        }
        if (!inPiAi) continue;

        if (trimmed === 'providers:') {
            inProviders = true;
            providersIndent = indent;
            currentProvider = null;
            continue;
        }

        if (inProviders) {
            if (indent <= providersIndent) {
                inProviders = false;
                currentProvider = null;
                continue;
            }
            if ((providerIndent === -1 || indent === providerIndent) && /^[a-zA-Z0-9._-]+:\s*$/.test(trimmed)) {
                providerIndent = indent;
                currentProvider = trimmed.slice(0, -1).trim();
                result[currentProvider] = result[currentProvider] ?? {};
                continue;
            }
            if (currentProvider && indent > providerIndent) {
                const entry = result[currentProvider];
                if (!entry) continue;
                const baseMatch = /^(?:baseURL|baseUrl):\s*(.+)$/.exec(trimmed);
                if (baseMatch && baseMatch[1]) {
                    entry.baseURL = baseMatch[1].trim().replace(/^['"]|['"]$/g, '');
                }
                const nameMatch = /^displayName:\s*(.+)$/.exec(trimmed);
                if (nameMatch && nameMatch[1]) {
                    entry.displayName = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
                }
            }
        }
    }
    return result;
}
