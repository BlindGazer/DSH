import type { ModelChoice } from '../../../shared/remote.js';

export type ModelMoveDirection = 'up' | 'down';

export function moveModel(models: readonly ModelChoice[], id: string, direction: ModelMoveDirection): readonly ModelChoice[] {
    const index = models.findIndex(model => model.id === id);
    const target = index + (direction === 'up' ? -1 : 1);
    const current = models[index];
    const neighbor = models[target];
    if (!current || !neighbor) return models;

    const reordered = [...models];
    reordered[index] = neighbor;
    reordered[target] = current;
    return reordered;
}
