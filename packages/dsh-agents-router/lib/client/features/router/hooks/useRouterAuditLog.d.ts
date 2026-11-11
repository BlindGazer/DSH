export declare function useRouterAuditLog(sessionId: string, active: boolean, setError: (error: string) => void): {
    auditText: string;
    setAuditText: import("react").Dispatch<import("react").SetStateAction<string>>;
};
