import type { IncomingMessage, ServerResponse } from 'node:http';
interface RouterActions {
    globalSettings: () => Promise<{
        settings: Record<string, unknown>;
    }>;
    state: (sessionId: string) => Promise<Record<string, unknown> | {
        ok: boolean;
        [key: string]: unknown;
    }>;
    audit: (sessionId: string) => Promise<{
        ok: boolean;
        text?: string;
        error?: string;
        status?: number;
    }>;
    saveGlobalSettings: (settings: Record<string, unknown>) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
    saveSettings: (sessionId: string, settings: Record<string, unknown>) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
    refresh: (sessionId: string) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
    reinitialize: (sessionId: string) => Promise<Record<string, unknown> | {
        ok: boolean;
        [key: string]: unknown;
    }>;
    reset: (sessionId: string) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
    diagnose: (sessionId: string, path: string) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
    openFile: (sessionId: string, path: string) => Promise<{
        ok: boolean;
        status?: number;
        error?: string;
    }>;
    workset: (sessionId: string, action: string, path: string) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
    deleteAudit: (sessionId: string) => Promise<{
        ok: boolean;
        [key: string]: unknown;
    }>;
}
export declare function createRouterHandler(actions: RouterActions): (req: IncomingMessage, res: ServerResponse) => void;
export {};
