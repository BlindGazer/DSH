import type React from 'react';
import type { RouterStateResponse } from '../../../shared/models/RouterModels.js';
export interface CatalogTabProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    filter: 'all' | 'active' | 'skipped';
    setFilter: (filter: 'all' | 'active' | 'skipped') => void;
    openFile: (filePath: string) => Promise<void>;
}
export declare function CatalogTab({ data, t, filter, setFilter, openFile }: CatalogTabProps): React.JSX.Element;
