import type { ProjectSettings, RouterPostBody, RouterStateResponse } from '../../../../shared/models/RouterModels.js';
export declare function useRouterData(sessionId: string): {
    data: RouterStateResponse | undefined;
    settings: ProjectSettings | undefined;
    setSettings: import("react").Dispatch<import("react").SetStateAction<ProjectSettings | undefined>>;
    error: string;
    setError: import("react").Dispatch<import("react").SetStateAction<string>>;
    busy: boolean;
    notice: string;
    setNotice: import("react").Dispatch<import("react").SetStateAction<string>>;
    slowPoll: boolean;
    points: {
        label: string;
        tokens: number;
    }[];
    reload: (signal?: AbortSignal) => Promise<boolean>;
    post: <T = void>(route: string, body?: RouterPostBody) => Promise<T>;
    run: (action: () => Promise<void>) => Promise<void>;
};
