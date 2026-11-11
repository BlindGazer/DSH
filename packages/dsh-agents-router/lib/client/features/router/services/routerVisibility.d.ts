export interface EventListenerPort<EventName extends string> {
    add(event: EventName, listener: () => void): void;
    remove(event: EventName, listener: () => void): void;
}
export declare function subscribeToRouterVisibility(documentEvents: EventListenerPort<'visibilitychange'>, windowEvents: EventListenerPort<'focus' | 'blur'>, onChange: () => void): () => void;
