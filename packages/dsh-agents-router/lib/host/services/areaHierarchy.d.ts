import type { AreaDefinition } from '../../shared/models/RouterModels.js';
/** Проверяет родительские области без зависимости файлового обхода от селектора правил. */
export declare function parentsAvailable(area: AreaDefinition, areas: ReadonlyMap<string, AreaDefinition>): boolean;
