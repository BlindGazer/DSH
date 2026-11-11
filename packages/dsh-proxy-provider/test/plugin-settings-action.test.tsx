import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProxyPluginSettingsAction } from '../src/client/features/locale-settings/components/ProxyPluginSettingsAction.js';

describe('Proxy Plugin Manager settings action', () => {
    it('shows language and full settings controls only on the Proxy package detail', () => {
        const markup = renderToString(<ProxyPluginSettingsAction subject={{ pkg: { name: '@kalex/dsh-proxy-provider' } }} />);

        expect(markup).toContain('Interface language');
        expect(markup).toContain('Proxy settings');
        expect(renderToString(<ProxyPluginSettingsAction subject={{ pkg: { name: '@other/plugin' } }} />)).toBe('');
    });
});
