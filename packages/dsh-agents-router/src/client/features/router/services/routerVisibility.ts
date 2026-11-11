export interface EventListenerPort<EventName extends string> {
    add(event: EventName, listener: () => void): void;
    remove(event: EventName, listener: () => void): void;
}

export function subscribeToRouterVisibility(
    documentEvents: EventListenerPort<'visibilitychange'>,
    windowEvents: EventListenerPort<'focus' | 'blur'>,
    onChange: () => void
): () => void {
    documentEvents.add('visibilitychange', onChange);
    windowEvents.add('focus', onChange);
    windowEvents.add('blur', onChange);
    return () => {
        documentEvents.remove('visibilitychange', onChange);
        windowEvents.remove('focus', onChange);
        windowEvents.remove('blur', onChange);
    };
}
