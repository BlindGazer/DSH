import { expect, test } from 'vitest';
import type { EventListenerPort } from '../src/client/features/router/services/routerVisibility.js';
import { subscribeToRouterVisibility } from '../src/client/features/router/services/routerVisibility.js';

test('subscribes to visibility events and removes every listener on cleanup', () => {
    const documentListeners = new Set<() => void>();
    const focusListeners = new Set<() => void>();
    const blurListeners = new Set<() => void>();
    const documentEvents: EventListenerPort<'visibilitychange'> = {
        add: (_event, listener) => documentListeners.add(listener),
        remove: (_event, listener) => documentListeners.delete(listener)
    };
    const windowEvents: EventListenerPort<'focus' | 'blur'> = {
        add: (event, listener) => (event === 'focus' ? focusListeners : blurListeners).add(listener),
        remove: (event, listener) => (event === 'focus' ? focusListeners : blurListeners).delete(listener)
    };
    let changes = 0;
    const onChange = (): void => {
        changes += 1;
    };

    const cleanup = subscribeToRouterVisibility(documentEvents, windowEvents, onChange);
    for (const listener of documentListeners) listener();
    for (const listener of focusListeners) listener();
    for (const listener of blurListeners) listener();
    expect(changes).toBe(3);

    cleanup();
    expect(documentListeners.size).toBe(0);
    expect(focusListeners.size).toBe(0);
    expect(blurListeners.size).toBe(0);
});
