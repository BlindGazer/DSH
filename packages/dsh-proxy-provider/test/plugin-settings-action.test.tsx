import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProxyPluginSettingsAction } from '../src/client/features/locale-settings/components/ProxyPluginSettingsAction.tsx';

describe('Proxy Plugin Manager settings action', () => {
    it('shows the full settings action only on the Proxy package detail', () => {
        const markup = renderToString(
            <ProxyPluginSettingsAction t={key => key} subject={{ pkg: { name: '@kalex/dsh-proxy-provider' } }} />
        );

        expect(markup).not.toContain('Interface language');
        expect(markup).toContain('Proxy settings');
        expect(renderToString(<ProxyPluginSettingsAction t={key => key} subject={{ pkg: { name: '@other/plugin' } }} />)).toBe('');
    });
});
