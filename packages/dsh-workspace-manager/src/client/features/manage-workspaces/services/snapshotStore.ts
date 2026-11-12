export interface SnapshotStore<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
    set(value: T): void;
}

export function createSnapshotStore<T>(initialValue: T): SnapshotStore<T> {
    let snapshot = initialValue;
    const listeners = new Set<() => void>();
    return {
        getSnapshot: () => snapshot,
        subscribe: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        set: value => {
            if (Object.is(snapshot, value)) return;
            snapshot = value;
            for (const listener of listeners) listener();
        }
    };
}
