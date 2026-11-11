import path from 'node:path';
import { FILE_ERROR } from '../../shared/constants/index.js';

type HookContext = Parameters<typeof currentDirectory>[0];
type HookState = Parameters<typeof refreshState>[2];
type HookStore = Parameters<typeof refreshState>[1];
type HookAgent = Parameters<typeof currentDirectory>[2];

interface HookExec {
    agent?: HookAgent;
    callId: string;
    name: string;
    parent?: string;
    rootCallId?: string;
    arguments: Record<string, string | undefined>;
}

type HookNext<TResult> = () => Promise<TResult>;
type HookDenyResult = Awaited<ReturnType<typeof denyCalls>> | { kind: 'deny'; reason: string };

import { recordAudit, shouldSkipBatchAudit } from './auditLogger.js';
import { matchInstructionRedirect, resolveInstructionDestination } from './instructionRedirection.js';
import { fileBatch, isFileTool, projectPaths } from './preflight.js';
import { renderRules, selectRules } from './ruleSelector.js';
import { currentDirectory, denyCalls, feedbackKey, historyHasRule, preflightEvent, refreshState } from './sessionController.js';

export function createPreflightHook<TResult>(
    ctx: HookContext,
    store: HookStore,
    states: Map<string, HookState>,
    pendingFeedback: Map<string, string>
): (exec: HookExec, next: HookNext<TResult>) => Promise<TResult | HookDenyResult> {
    return async (exec, next) => {
        if (!isFileTool(exec.name)) return next();
        const agent = exec.agent;
        if (!agent) return next();
        const state = states.get(agent.id);
        if (!state) return next();
        const rootCallId = exec.rootCallId ?? exec.callId;
        if (exec.parent !== undefined && state.blockedRoots.has(rootCallId)) {
            const reason = state.blockedRoots.get(rootCallId) ?? '';
            pendingFeedback.set(feedbackKey(state.agent.id, exec.callId), reason);
            return { kind: 'deny', reason };
        }

        const batch = fileBatch(exec.agent, exec);
        const calls = batch.calls.length ? batch.calls : [{ callId: exec.callId, name: exec.name, paths: [] }];
        const batchKey = calls
            .map(call => call.callId)
            .toSorted()
            .join('|');
        const cwd = currentDirectory(ctx, state, agent);
        const paths = new Set<string>();
        let currentPaths: string[] = [];
        let pathError: Error | undefined;
        for (const call of calls) {
            for (const rawPath of call.paths ?? []) {
                try {
                    const resolvedPaths = await projectPaths(state.projectRoot, cwd, rawPath);
                    if (call.callId === exec.callId) currentPaths = resolvedPaths;
                    for (const resolved of resolvedPaths) paths.add(resolved);
                } catch (error) {
                    pathError ??= error instanceof Error ? error : new Error(String(error));
                }
            }
        }
        if (pathError) {
            const reason = `agents-router could not resolve a project file path; file operation denied: ${pathError.message}`;
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                preflight: `denied: ${FILE_ERROR} (${pathError.message})`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }
        if (!paths.size && !batch.error) return next();

        const previousPaths = state.activePaths;
        let persisted: Awaited<ReturnType<HookStore['updateSession']>>;
        try {
            persisted = await store.updateSession(state.sessionId, state.projectRoot, session => ({
                ...session,
                activePaths: [...new Map([...state.activePaths, ...paths].map(value => [value.toLowerCase(), value])).values()]
            }));
        } catch (error) {
            const reason = `agents-router could not persist the project workset; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                preflight: `denied: ${FILE_ERROR} (workset persistence failed)`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }
        state.activePaths = persisted.state.activePaths;
        state.forceEmptyWorkset = false;

        let addedPaths: string[] = [];
        try {
            await refreshState(ctx, store, state);
            addedPaths = state.activePaths.filter(item => !previousPaths.includes(item));
        } catch (error) {
            const reason = `agents-router could not refresh project instructions; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                preflight: `denied: ${FILE_ERROR} (refresh failed)`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }
        const snapshot = state.snapshot;
        let worksetChange = `+added: [${addedPaths.join(', ')}] | total: ${state.activePaths.length}`;

        if (!snapshot) {
            const reason = 'agents-router could not inspect project rules; file operation denied.';
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                workset: worksetChange,
                preflight: `denied: ${FILE_ERROR} (project discovery unavailable)`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }

        if (batch.error) {
            const reason = `agents-router could not safely preflight this file-call batch: ${batch.error}. No file call in the batch was run.`;
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                workset: worksetChange,
                preflight: `denied: ${FILE_ERROR} (${batch.error})`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }
        if (!paths.size) return next();
        if (!snapshot.rulesComplete) {
            const reason =
                'agents-router could not read all configured project rules; file operation denied until rule discovery succeeds.';
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                workset: worksetChange,
                preflight: `denied: ${FILE_ERROR} (rule discovery incomplete)`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }

        let redirectPath: string | undefined;
        const redirectEnabled = state.settings.redirectRootInstructionFiles || state.settings.redirectInstructionDirectories;
        if (exec.name === 'read' && redirectEnabled && snapshot.areasConfigValid) {
            const relativeTarget = matchInstructionRedirect(currentPaths, state.settings);
            if (relativeTarget) {
                paths.add(`agents/${relativeTarget}`);
                try {
                    redirectPath = await resolveInstructionDestination(state.projectRoot, relativeTarget);
                } catch (error) {
                    const reason = `agents-router could not safely redirect this read to agents/${relativeTarget}; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
                    await recordAudit(state, store, {
                        event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                        workset: worksetChange,
                        preflight: `denied: ${FILE_ERROR} (instruction destination unavailable or unsafe)`
                    });
                    return denyCalls(calls, exec, pendingFeedback, state, reason);
                }
                const destinationRelative = path.relative(state.projectRoot, redirectPath).split(path.sep).join('/');
                paths.add(destinationRelative);
                if (!state.activePaths.some(value => value.toLowerCase() === destinationRelative.toLowerCase())) {
                    try {
                        persisted = await store.updateSession(state.sessionId, state.projectRoot, session => ({
                            ...session,
                            activePaths: [
                                ...new Map(
                                    [...session.activePaths, destinationRelative].map(value => [value.toLowerCase(), value])
                                ).values()
                            ]
                        }));
                    } catch (error) {
                        const reason = `agents-router could not persist the redirected project path; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
                        await recordAudit(state, store, {
                            event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                            workset: worksetChange,
                            preflight: `denied: ${FILE_ERROR} (redirected workset persistence failed)`
                        });
                        return denyCalls(calls, exec, pendingFeedback, state, reason);
                    }
                    state.activePaths = persisted.state.activePaths;
                    state.rules = selectRules(snapshot, state.activePaths);
                    state.text = renderRules(state.rules);
                    addedPaths = state.activePaths.filter(item => !previousPaths.includes(item));
                    worksetChange = `+added: [${addedPaths.join(', ')}] | total: ${state.activePaths.length}`;
                }
            }
        }

        const continueWithRedirect = async () => {
            if (!redirectPath) return next();
            try {
                exec.arguments = { ...exec.arguments, file_path: redirectPath };
                if (exec.arguments.file_path !== redirectPath) throw new Error('the tool arguments are immutable');
            } catch (error) {
                const reason = `agents-router could not safely apply the redirected file path; file operation denied: ${error instanceof Error ? error.message : String(error)}`;
                await recordAudit(state, store, {
                    event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                    workset: worksetChange,
                    preflight: `denied: ${FILE_ERROR} (argument rewrite failed)`
                });
                return denyCalls(calls, exec, pendingFeedback, state, reason);
            }
            return next();
        };

        const applicable = selectRules(snapshot, [...paths]);
        const missing = applicable.filter(rule => !historyHasRule(agent.session, rule));
        if (missing.length) {
            const sources = missing.map(rule => `${rule.sourcePath} (${rule.hash?.slice(0, 12) ?? ''})`).join(', ');
            const reason = `agents-router loaded new or changed instructions for this file-call batch: ${sources}. No file call in the batch was run. Review the current runtime context and re-plan before retrying.`;
            await recordAudit(state, store, {
                event: preflightEvent('preflight_intercept', exec.name, paths, calls),
                workset: worksetChange,
                preflight: `denied: ${FILE_ERROR} (new instructions injected)`
            });
            return denyCalls(calls, exec, pendingFeedback, state, reason);
        }
        if (shouldSkipBatchAudit(state, batchKey, addedPaths, missing.length > 0, Boolean(batch.error))) return continueWithRedirect();
        await recordAudit(state, store, {
            event: preflightEvent('file_preflight', exec.name, addedPaths, calls),
            workset: worksetChange,
            preflight: 'preflight: ok',
            diagnostics: [...state.runtimeDiagnostics.values()],
            batchKey
        });
        return continueWithRedirect();
    };
}
