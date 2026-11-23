import { TestId } from '@kalex/dsh-core';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { proxyStore } from '../src/client/app/proxyStore.ts';
import { ProviderCardProxyEntry } from '../src/client/features/provider-card/components/ProviderCardProxyEntry.tsx';

describe('provider card loading state', () => {
    it('shows the shared loading indicator while proxy settings are loading', () => {
        const initialLoading = proxyStore.snapshot.loading;
        proxyStore.publish({ loading: true });

        try {
            const markup = renderToString(<ProviderCardProxyEntry t={key => key} providerId="openai" />);
            expect(markup).toContain(`data-testid="${TestId.Common.Loading}"`);
        } finally {
            proxyStore.publish({ loading: initialLoading });
        }
    });
});
