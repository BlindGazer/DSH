export interface ParsedYamlProvider {
    baseURL?: string;
    displayName?: string;
}
/**
 * Разбирает секцию llm-pi-ai из файла cordis.patch.yml для обнаружения пользовательских провайдеров.
 */
export declare function parseProvidersFromPatchYaml(yamlText: string): Record<string, ParsedYamlProvider>;
