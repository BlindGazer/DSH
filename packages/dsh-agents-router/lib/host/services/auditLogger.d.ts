import type { RouterDiagnostic } from '../../shared/models/RouterModels.js';
import type { selectRules } from './ruleSelector.js';
type SelectedRule = ReturnType<typeof selectRules>[number];
interface AuditState {
    auditRules?: Map<string, SelectedRule>;
    rules: SelectedRule[];
    text: string;
    areaText: string;
    settings: {
        logCategories: {
            events?: boolean;
            workset?: boolean;
            rulesDiff?: boolean;
            preflight?: boolean;
            diagnostics?: boolean;
        };
    };
    projectRoot: string;
    sessionId: string;
    lastLoggedBatchKey?: string;
    lastLoggedDiagKeys?: Set<string>;
    auditWarning?: string;
}
interface AuditStore {
    appendAuditLog(projectRoot: string, sessionId: string, lines: string): Promise<boolean>;
}
interface AuditRecord {
    event?: string;
    workset?: string;
    preflight?: string;
    diagnostics?: readonly RouterDiagnostic[];
    batchKey?: string;
}
export declare function shouldSkipBatchAudit(state: AuditState, batchKey: string | undefined, addedPaths: readonly string[], hasMissingRules: boolean, hasBatchError: boolean): boolean;
export declare function recordAudit(state: AuditState, store: AuditStore, { event, workset, preflight, diagnostics, batchKey }?: AuditRecord): Promise<boolean>;
export {};
