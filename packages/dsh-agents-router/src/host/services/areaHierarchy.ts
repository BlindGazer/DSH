import type { AreaDefinition } from '../../shared/models/RouterModels.js';

/** Проверяет родительские области без зависимости файлового обхода от селектора правил. */
export function parentsAvailable(area: AreaDefinition, areas: ReadonlyMap<string, AreaDefinition>): boolean {
    let parent = area.parent;
    while (parent) {
        const item = areas.get(parent);
        if (!item?.enabled || item.available === false) return false;
        parent = item.parent;
    }
    return true;
}
