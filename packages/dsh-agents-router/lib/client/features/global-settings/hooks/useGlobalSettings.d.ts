import type { GlobalSettings } from '../../../../shared/models/RouterModels.js';
export declare function useGlobalSettings(): {
    settings: GlobalSettings | undefined;
    notice: string;
    error: string;
    busy: boolean;
    reload: () => Promise<void>;
    update: <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => void;
    resetDefaults: () => void;
    save: (savedMessage: string) => Promise<void>;
    setNotice: import("react").Dispatch<import("react").SetStateAction<string>>;
};
