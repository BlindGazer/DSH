import type React from 'react';
import type { DiscoveredRuleWithState, RouterPostBody, RouterStateResponse } from '../../../shared/models/RouterModels.js';
export interface MemoryWorksetTabProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    points: Array<{
        label: string;
        tokens: number;
    }>;
    path: string;
    setPath: (value: string) => void;
    openFile: (filePath: string) => Promise<void>;
    addPath: (event: React.FormEvent) => void;
    busy: boolean;
    run: (action: () => Promise<void>) => Promise<void>;
    post: <T = void>(route: string, body?: RouterPostBody) => Promise<T>;
    activeRules: DiscoveredRuleWithState[];
    matched: DiscoveredRuleWithState[];
    always: DiscoveredRuleWithState[];
}
export declare function MemoryWorksetTab({ data, t, points, path, setPath, openFile, addPath, busy, run, post, activeRules, matched, always }: MemoryWorksetTabProps): React.JSX.Element;
