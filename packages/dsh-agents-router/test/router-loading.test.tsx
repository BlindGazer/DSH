import { TestId } from '@kalex/dsh-core';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RouterView } from '../src/client/app/RouterView.js';
import { GlobalSettingsCard } from '../src/client/features/global-settings/GlobalSettingsCard.js';

describe('router loading states', () => {
    it('shows the shared loading indicator while router data is pending', () => {
        const markup = renderToString(<RouterView sessionId="loading-session" />);

        expect(markup).toContain(`data-testid="${TestId.Common.Loading}"`);
    });

    it('shows the shared loading indicator while global settings are pending', () => {
        const markup = renderToString(<GlobalSettingsCard />);

        expect(markup).toContain(`data-testid="${TestId.Common.Loading}"`);
    });
});
