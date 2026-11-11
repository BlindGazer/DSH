import type React from 'react';
import type { RouterPostBody, RouterStateResponse } from '../../../shared/models/RouterModels.js';
export interface RouterHeaderProps {
    data: RouterStateResponse;
    t: (key: string) => string;
    pollActive: boolean;
    slowPoll: boolean;
    pollInterval: number;
    busy: boolean;
    run: (action: () => Promise<void>) => Promise<void>;
    post: <T = void>(route: string, body?: RouterPostBody) => Promise<T>;
    onSettings: () => void;
}
export declare function RouterHeader({ data, t, pollActive, slowPoll, pollInterval, busy, run, post, onSettings }: RouterHeaderProps): React.JSX.Element;
