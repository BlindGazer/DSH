export interface SelectedModel {
    readonly provider: string;
    readonly model: string;
}
export interface ModelSelectionState {
    readonly current?: SelectedModel;
    readonly routable?: boolean;
}
export interface ModelSelectionSource {
    readonly store: {
        getSnapshot(): ModelSelectionState;
        subscribe(listener: () => void): () => void;
    };
    load(): Promise<ModelSelectionState>;
}
export interface ModelDirectories {
    directoryFor(sessionId: string): ModelSelectionSource;
}

const selections = new Map<symbol, SelectedModel>();
const listeners = new Set<() => void>();
let snapshot: readonly SelectedModel[] = [];
function publish(): void {
    snapshot = [...selections.values()];
    for (const listener of listeners) listener();
}
export const selectedModels = {
    subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getSnapshot: (): readonly SelectedModel[] => snapshot,
    retain(selection: SelectedModel): () => void {
        const owner = Symbol();
        selections.set(owner, selection);
        publish();
        return () => {
            if (selections.delete(owner)) publish();
        };
    }
};
