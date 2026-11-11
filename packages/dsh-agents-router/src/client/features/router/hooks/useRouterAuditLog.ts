import { useEffect, useState } from 'react';
import { routerApi } from '../services/routerApi.js';

export function useRouterAuditLog(sessionId: string, active: boolean, setError: (error: string) => void) {
    const [auditText, setAuditText] = useState('');
    useEffect(() => {
        if (!active) return undefined;
        const controller = new AbortController();
        void routerApi
            .loadAudit(sessionId, controller.signal)
            .then(result => {
                if (!controller.signal.aborted) setAuditText(result.text);
            })
            .catch(cause => {
                if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
            });
        return () => controller.abort();
    }, [active, sessionId, setError]);
    return { auditText, setAuditText };
}
