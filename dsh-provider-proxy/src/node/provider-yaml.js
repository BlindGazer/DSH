/**
 * Lightweight parser for `cordis.patch.yml` to discover `llm-pi-ai` providers
 * even when DSH services are not yet hydrated or during standalone tests.
 */
export function parseProvidersFromPatchYaml(yamlText) {
  const result = {};
  if (typeof yamlText !== 'string' || !yamlText.includes('llm-pi-ai')) return result;
  const lines = yamlText.split(/\r?\n/);
  let inPiAi = false;
  let inProviders = false;
  let providersIndent = -1;
  let currentProvider = null;
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
      if (
        (providerIndent === -1 || indent === providerIndent) &&
        /^[a-zA-Z0-9._-]+:\s*$/.test(trimmed)
      ) {
        providerIndent = indent;
        currentProvider = trimmed.slice(0, -1).trim();
        result[currentProvider] = result[currentProvider] || {};
        continue;
      }
      if (currentProvider && indent > providerIndent) {
        const baseMatch = trimmed.match(/^(?:baseURL|baseUrl):\s*(.+)$/);
        if (baseMatch) {
          result[currentProvider].baseURL = baseMatch[1].trim().replace(/^['"]|['"]$/g, '');
        }
        const nameMatch = trimmed.match(/^displayName:\s*(.+)$/);
        if (nameMatch) {
          result[currentProvider].displayName = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
        }
      }
    }
  }
  return result;
}
