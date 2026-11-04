    // Exclusive GUI session token held in private module closure (never exposed on `window`)
    let guiSessionToken = null;
    let tokenClaimPromise = null;
    let heartbeatTimer = null;

    async function ensureGuiSessionToken() {
      if (guiSessionToken) return guiSessionToken;
      if (tokenClaimPromise) return tokenClaimPromise;
      tokenClaimPromise = (async () => {
        try {
          const res = await fetch(`${API_BASE}/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-kpp-client': 'dsh-web-ui'
            },
            body: JSON.stringify({ action: 'claim' })
          });
          const data = await res.json();
          if (data && data.ok && typeof data.token === 'string') {
            guiSessionToken = data.token;
            startHeartbeat();
          }
        } catch {
          /* ignore in unit-test sandbox if session endpoint is mocked */
        } finally {
          tokenClaimPromise = null;
        }
        return guiSessionToken;
      })();
      return tokenClaimPromise;
    }

    function startHeartbeat() {
      if (heartbeatTimer || typeof window === 'undefined' || typeof setInterval !== 'function') return;
      heartbeatTimer = setInterval(() => {
        if (!guiSessionToken) return;
        fetch(`${API_BASE}/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-kpp-client': 'dsh-web-ui',
            'x-kpp-token': guiSessionToken
          },
          body: JSON.stringify({ action: 'heartbeat' })
        }).catch(() => {});
      }, 4000);

      if (typeof window.addEventListener === 'function') {
        window.addEventListener('beforeunload', () => {
          if (!guiSessionToken) return;
          fetch(`${API_BASE}/session`, {
            method: 'POST',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'x-kpp-client': 'dsh-web-ui',
              'x-kpp-token': guiSessionToken
            },
            body: JSON.stringify({ action: 'release', token: guiSessionToken })
          }).catch(() => {});
        });
      }
    }

    async function apiFetch(path, options = {}) {
      const token = await ensureGuiSessionToken();
      const headers = {
        ...(options.headers || {}),
        'x-kpp-client': 'dsh-web-ui',
        ...(token ? { 'x-kpp-token': token } : {})
      };
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers
      });
    }

    // Shared reactive client store so all provider cards + footer + modal stay in sync
    const store = {
      snapshot: {
        loading: true,
        modalOpen: false,
        config: {
          profiles: [],
          providerBindings: {},
          defaultTestUrl: DEFAULT_TEST_URL
        },
        providers: [],
        conflicts: [],
        routes: {},
        error: null
      },
      listeners: new Set(),
      subscribe(fn) {
        store.listeners.add(fn);
        return () => store.listeners.delete(fn);
      },
      publish(patch) {
        store.snapshot = { ...store.snapshot, ...patch };
        for (const fn of store.listeners) {
          try {
            fn(store.snapshot);
          } catch {
            /* ignore */
          }
        }
      },
      async refresh() {
        try {
          const res = await apiFetch('/state');
          const data = await res.json();
          if (data && data.ok) {
            store.publish({
              loading: false,
              config: data.config || store.snapshot.config,
              providers: data.providers || [],
              conflicts: data.conflicts || [],
              routes: data.routes || {},
              error: null
            });
          }
        } catch (err) {
          store.publish({
            loading: false,
            error: err?.message || 'Failed to load proxy settings'
          });
        }
      },
      async saveConfig(nextConfig) {
        const res = await apiFetch('/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextConfig)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || 'Failed to save proxy configuration');
        }
        store.publish({
          config: data.config,
          providers: data.providers || store.snapshot.providers,
          conflicts: data.conflicts || [],
          routes: data.routes || {},
          error: null
        });
        return data;
      },
      async bindProvider(providerId, profileId) {
        const res = await apiFetch('/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, profileId: profileId || null })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || 'Failed to bind provider proxy');
        }
        store.publish({
          config: data.config,
          providers: data.providers || store.snapshot.providers,
          conflicts: data.conflicts || [],
          routes: data.routes || {},
          error: null
        });
        return data;
      },
      async testConnection(profile, testUrl) {
        const res = await apiFetch('/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile, testUrl })
        });
        return res.json();
      },
      async exportConfig(options = {}) {
        const res = await apiFetch('/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || 'Failed to export proxy configuration');
        }
        return data.exportData;
      },
      async importConfig(payload, options = {}) {
        const res = await apiFetch('/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload,
            password: options?.password || '',
            skipCredentials: Boolean(options?.skipCredentials)
          })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || 'Failed to import proxy configuration');
        }
        store.publish({
          config: data.config,
          providers: data.providers || store.snapshot.providers,
          conflicts: data.conflicts || [],
          routes: data.routes || {},
          error: null
        });
        return data;
      }
    };
