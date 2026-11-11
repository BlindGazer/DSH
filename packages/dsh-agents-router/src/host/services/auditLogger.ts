import type { RouterDiagnostic } from '../../shared/models/RouterModels.js';
import { computeRuleMetrics } from './metrics.js';
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

export function shouldSkipBatchAudit(
    state: AuditState,
    batchKey: string | undefined,
    addedPaths: readonly string[],
    hasMissingRules: boolean,
    hasBatchError: boolean
): boolean {
    return addedPaths.length === 0 && !hasMissingRules && !hasBatchError && state.lastLoggedBatchKey === batchKey;
}

export async function recordAudit(
    state: AuditState,
    store: AuditStore,
    { event, workset, preflight, diagnostics, batchKey }: AuditRecord = {}
): Promise<boolean> {
    const previous = state.auditRules ?? new Map();
    const current = new Map(state.rules.map(rule => [rule.sourcePath, rule]));
    const added = [...current].filter(([source]) => !previous.has(source));
    const evicted = [...previous].filter(([source]) => !current.has(source));
    const revised = [...current].filter(([source, rule]) => previous.has(source) && previous.get(source).hash !== rule.hash);
    const unchanged = [...current].filter(([source, rule]) => previous.has(source) && previous.get(source).hash === rule.hash);
    const knownDiagnostics = state.lastLoggedDiagKeys ?? new Set<string>();
    const newDiagnostics = (diagnostics ?? []).filter(item => !knownDiagnostics.has(diagnosticKey(item)));
    for (const item of diagnostics ?? []) knownDiagnostics.add(diagnosticKey(item));

    if (event === 'prompt_assemble' && !added.length && !evicted.length && !revised.length && !newDiagnostics.length) return false;

    const categories = state.settings.logCategories;
    const lines: string[] = [];
    if (categories.events && event) lines.push(`event: ${event}`);
    if (categories.workset && workset) lines.push(`workset: ${workset}`);
    if (categories.rulesDiff) {
        const metrics = computeRuleMetrics(state);
        lines.push('rules_diff:', `  active: ${current.size} | chars: ${metrics.characters} | est_tokens: ${metrics.estTokens}`);
        for (const [source, rule] of added) {
            const matchReason = rule.appliesTo.includes('always')
                ? 'always'
                : `area=${rule.area}; rule=${rule.path?.join(' OR ') || 'unrestricted'}; file=${rule.appliesTo.join(', ')}`;
            lines.push(`  + ${source} @${rule.hash?.slice(0, 8) ?? 'unknown'} [${matchReason}] (${rule.content?.length ?? 0}c)`);
        }
        if (evicted.length) lines.push(`  evicted: ${evicted.map(([source]) => `${source} (no longer selected)`).join(', ')}`);
        if (revised.length)
            lines.push(
                `  rev_changed: ${revised.map(([source, rule]) => `${source} old=${previous.get(source)?.hash?.slice(0, 8) ?? 'unknown'} new=${rule.hash?.slice(0, 8) ?? 'unknown'} (source revision changed)`).join(', ')}`
            );
        const unchangedAlways = unchanged.filter(([, rule]) => rule.appliesTo.includes('always')).length;
        const unchangedMatched = unchanged.length - unchangedAlways;
        lines.push(
            `  unchanged: ${unchanged.length}${unchanged.length ? ` (${unchangedAlways} always, ${unchangedMatched} matched)` : ''} | evicted: ${evicted.length} | rev_changed: ${revised.length}`
        );
    }
    if (categories.preflight && (preflight || newDiagnostics.length)) {
        if (preflight) lines.push(`diagnostics: ${preflight}`);
        if (newDiagnostics.length)
            lines.push(
                `diagnostics: warnings: ${newDiagnostics.length} [${[...new Set(newDiagnostics.map(item => item.code))].join(', ')}]`
            );
    }
    if (!lines.length) return false;
    try {
        const logged = await store.appendAuditLog(state.projectRoot, state.sessionId, lines.join('\n'));
        if (!logged) return false;
        state.auditRules = current;
        state.lastLoggedDiagKeys = knownDiagnostics;
        if (batchKey && event?.startsWith('file_preflight')) state.lastLoggedBatchKey = batchKey;
        return true;
    } catch (error) {
        state.auditWarning = `audit log could not be written: ${error instanceof Error ? error.message : String(error)}`;
        return false;
    }
}

function diagnosticKey(item: RouterDiagnostic): string {
    return item.key ?? `${item.code}:${item.path ?? ''}:${item.message}`;
}
