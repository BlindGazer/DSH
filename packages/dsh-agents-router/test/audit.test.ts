import { assert, expect, test } from 'vitest';
import { recordAudit, shouldSkipBatchAudit } from '../src/host/services/auditLogger.js';
import type { DiscoveredRule } from '../src/shared/models/RouterModels.js';

const state = () => ({
    lastLoggedBatchKey: '',
    settings: { logCategories: { events: true, workset: true, rulesDiff: true, preflight: true } },
    projectRoot: 'project',
    sessionId: 'session',
    rules: [
        {
            sourcePath: 'agents/always.md',
            filePath: 'project/agents/always.md',
            enabled: true,
            hash: '123456789',
            area: 'global',
            path: [],
            appliesTo: ['always'],
            content: 'instruction'
        } satisfies DiscoveredRule
    ],
    text: 'rendered rules',
    areaText: '',
    auditRules: new Map(),
    lastLoggedDiagKeys: new Set<string>()
});

test('prompt assembly skips unchanged audit snapshots and repeated diagnostics', async () => {
    const entries: string[] = [];
    const store = {
        appendAuditLog: async (_root: string, _session: string, text: string) => {
            entries.push(text);
            return true;
        }
    };
    const current = state();
    await recordAudit(current, store, {
        event: 'session_init',
        diagnostics: [{ key: 'warning-1', code: 'test', path: 'test', message: 'warning' }]
    });
    assert.equal(
        await recordAudit(current, store, {
            event: 'prompt_assemble',
            diagnostics: [{ key: 'warning-1', code: 'test', path: 'test', message: 'warning' }]
        }),
        false
    );
    assert.equal(entries.length, 1);
    assert.equal(
        await recordAudit(current, store, {
            event: 'prompt_assemble',
            diagnostics: [{ key: 'warning-2', code: 'new', path: 'test', message: 'warning' }]
        }),
        true
    );
    assert.equal(entries.length, 2);
    const newDiagnosticEntry = entries[1];
    assert.ok(newDiagnosticEntry);
    assert.match(newDiagnosticEntry, /warnings: 1 \[new\]/);
});

test('batch audit suppression only skips already logged clean batches', () => {
    const current = { ...state(), lastLoggedBatchKey: 'read-1|read-2' };
    assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', [], false, false), true);
    assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', ['src/new.ts'], false, false), false);
    assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', [], true, false), false);
    assert.equal(shouldSkipBatchAudit(current, 'read-1|read-2', [], false, true), false);
    assert.equal(shouldSkipBatchAudit(current, 'new-batch', [], false, false), false);
});

test('audit diffs summarize unchanged rules and successful batches', async () => {
    const entries: string[] = [];
    const store = {
        appendAuditLog: async (_root: string, _session: string, text: string) => {
            entries.push(text);
            return true;
        }
    };
    const current = state();
    await recordAudit(current, store, { event: 'session_init' });
    await recordAudit(current, store, { event: 'file_preflight tool="read" (+0 paths)', batchKey: 'call-1' });
    assert.equal(current.lastLoggedBatchKey, 'call-1');
    const unchangedRuleEntry = entries[1];
    assert.ok(unchangedRuleEntry);
    assert.match(unchangedRuleEntry, /unchanged: 1 \(1 always, 0 matched\) \| evicted: 0 \| rev_changed: 0/);
    expect(unchangedRuleEntry).not.toMatch(/agents\/always\.md @12345678/);
});
