export const reactExternals = Object.freeze(['react', 'react/jsx-runtime']);

const dshClientExternals = Object.freeze([
    ...reactExternals,
    '@deepseek-ai/dsh-client-ui-conversation',
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-plugin-manager',
    '@deepseek-ai/dsh-client-ui-renderer',
    '@deepseek-ai/dsh-client-ui-settings-models',
    '@deepseek-ai/dsh-client-ui-settings',
    '@deepseek-ai/dsh-client-ui-slots'
]);

export function getDshClientExternals(additional = []) {
    return [...dshClientExternals, ...additional];
}
