import { randomUUID } from 'node:crypto';

import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert, test } from 'vitest';
import { discoverProject } from '../src/host/services/discovery.js';
import { filterRootInstructionMessages } from '../src/host/services/instructionRedirection.js';
import { createPreflightHook } from '../src/host/services/preflightHook.js';
import type { RouterAgent, RouterHostContext, RouterMessage, RouterState } from '../src/host/services/sessionController.js';
import { RouterStore } from '../src/host/services/store.js';
import { RULE_CONTEXT } from '../src/shared/constants/index.js';
import { DEFAULT_PROJECT_SETTINGS } from '../src/shared/index.js';

type FilterInputMessage = Parameters<typeof filterRootInstructionMessages>[0][number];

interface FilteredInstructionMessage extends FilterInputMessage {
    source: NonNullable<FilterInputMessage['source']> & {
        form: string;
        custom: string;
        changes: { action?: string; path?: string }[];
    };
}

function isFilteredInstructionMessage(message: FilterInputMessage | undefined): message is FilteredInstructionMessage {
    const source = message?.source;
    return Boolean(
        source &&
            'changes' in source &&
            Array.isArray(source.changes) &&
            'form' in source &&
            typeof source.form === 'string' &&
            'custom' in source &&
            typeof source.custom === 'string'
    );
}

function instructionText(message: FilterInputMessage | undefined): string | undefined {
    return message?.content?.find(
        (block): block is { type: string; text: string } => block.type === 'text' && typeof block.text === 'string'
    )?.text;
}

interface TestToolExecution {
    callId: string;
    name: string;
    arguments: { file_path: string };
    agent: RouterAgent;
}

async function createHarness(options: { settings?: Record<string, boolean | string[]>; configText?: string | undefined } = {}) {
    const { settings = {} } = options;
    const configText = Object.hasOwn(options, 'configText') ? options.configText : '{"areas":{}}';
    const projectRoot = await mkdtemp(path.join(tmpdir(), `dsh-router-hook-${randomUUID()}-`));
    await mkdir(path.join(projectRoot, 'agents', 'dsh'), { recursive: true });
    await mkdir(path.join(projectRoot, 'agents', 'rules'), { recursive: true });
    await mkdir(path.join(projectRoot, '.cursor', 'rules'), { recursive: true });
    await mkdir(path.join(projectRoot, '.claude', 'rules'), { recursive: true });
    await mkdir(path.join(projectRoot, '.other', 'rules'), { recursive: true });
    if (configText !== undefined) await writeFile(path.join(projectRoot, 'agents', 'dsh', 'agents-router.json'), configText, 'utf8');
    await writeFile(path.join(projectRoot, 'AGENTS.md'), 'private root content', 'utf8');
    await writeFile(path.join(projectRoot, 'agents', 'AGENTS.md'), 'isolated root content', 'utf8');
    await writeFile(path.join(projectRoot, '.cursor', 'rules', 'example.mdc'), 'private cursor content', 'utf8');
    await writeFile(path.join(projectRoot, '.claude', 'rules', 'example.mdc'), 'private claude content', 'utf8');
    await writeFile(path.join(projectRoot, '.other', 'rules', 'unmapped.mdc'), 'private unmapped content', 'utf8');
    await writeFile(path.join(projectRoot, 'agents', 'rules', 'example.mdc'), 'isolated directory content', 'utf8');
    const initialSnapshot = await discoverProject(projectRoot);
    const initialRuleContext = initialSnapshot.rules
        .map(({ hash }) => (hash ? `Revision: ${hash}` : ''))
        .filter(Boolean)
        .join('\n');

    const projectSettings = { ...DEFAULT_PROJECT_SETTINGS, mainFile: 'router.md', ...settings };
    let currentExec: TestToolExecution | undefined;
    const toolCall = () => ({
        type: 'tool-call',
        id: currentExec?.callId ?? '',
        name: currentExec?.name ?? '',
        arguments: JSON.stringify(currentExec?.arguments ?? {})
    });
    const agent: RouterAgent = {
        id: 'agent-test',
        status: 'idle',
        session: {
            id: 'session-test',
            header: { cwd: projectRoot },
            deriveMessages: (): RouterMessage[] => [
                {
                    role: 'assistant',
                    content: [toolCall()]
                },
                {
                    role: 'assistant',
                    content: [],
                    source: {
                        kind: 'runtime-context',
                        form: 'snapshot',
                        sections: [{ name: RULE_CONTEXT, text: initialRuleContext }]
                    }
                }
            ]
        },
        inbox: { nextTurn: [], nextStep: [] },
        runMaintenance: async action => action({ throwIfAborted() {} })
    };
    const store = new RouterStore(path.join(projectRoot, '.dsh-test-home'));
    await store.saveProjectSettings(projectRoot, projectSettings);
    const ctx: RouterHostContext = {
        agents: { list: () => [agent] },
        workingDirectory: { get: () => projectRoot },
        logger: { warn() {}, error() {} },
        skills: { list: async () => [] }
    };
    const state: RouterState = {
        agent,
        sessionId: agent.session.id,
        projectRoot,
        settings: projectSettings,
        activePaths: [],
        areaText: '',
        snapshot: undefined,
        rules: [],
        text: '',
        source: 'test',
        blockedRoots: new Map<string, string>(),
        runtimeDiagnostics: new Map(),
        forceEmptyWorkset: false,
        invalidateSkills() {}
    };
    const states = new Map([[agent.id, state]]);
    const pendingFeedback = new Map<string, string>();
    const hook = createPreflightHook<string>(ctx, store, states, pendingFeedback);
    const run = async (
        name: string,
        filePath: string,
        activeHook: ReturnType<typeof createPreflightHook<string>> = hook,
        next?: () => string | Promise<string>,
        freezeArguments = false
    ) => {
        const toolArguments = { file_path: filePath };
        const execution: TestToolExecution = {
            callId: randomUUID(),
            name,
            arguments: freezeArguments ? Object.freeze(toolArguments) : toolArguments,
            agent
        };
        currentExec = execution;
        return activeHook(execution, next ? async () => next() : async () => readFile(execution.arguments.file_path, 'utf8'));
    };
    return { projectRoot, state, ctx, store, hook, run, pendingFeedback, dispose: () => rm(projectRoot, { recursive: true, force: true }) };
}

test('redirects matching root and nested directory reads before invoking the tool', async () => {
    const harness = await createHarness({
        settings: {
            redirectRootInstructionFiles: true,
            rootInstructionFileNames: ['AGENTS.md'],
            redirectInstructionDirectories: true,
            instructionDirectoryNames: ['.cursor', '.claude']
        }
    });
    try {
        assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md')), 'isolated root content');
        assert.equal(
            await harness.run('read', path.join(harness.projectRoot, '.cursor', 'rules', 'example.mdc')),
            'isolated directory content'
        );
        assert.equal(
            await harness.run('read', path.join(harness.projectRoot, '.claude', 'rules', 'example.mdc')),
            'isolated directory content'
        );
        assert.ok(harness.state.activePaths.includes('agents/AGENTS.md'));
        assert.ok(harness.state.activePaths.includes('agents/rules/example.mdc'));
    } finally {
        await harness.dispose();
    }
});

test('replaces frozen tool arguments when applying a redirect', async () => {
    const harness = await createHarness({
        settings: {
            redirectRootInstructionFiles: true,
            rootInstructionFileNames: ['AGENTS.md']
        }
    });
    try {
        assert.equal(
            await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md'), harness.hook, undefined, true),
            'isolated root content'
        );
        assert.equal(await harness.run('read', 'AGENTS.md', harness.hook, undefined, true), 'isolated root content');
    } finally {
        await harness.dispose();
    }
});

test('filters only redirected root instruction sections and preserves message metadata', () => {
    const globalChange = { action: 'set', scope: 'user-global', path: '$DSH_HOME/AGENTS.md' };
    const rootChange = { action: 'set', scope: '.', path: 'AGENTS.md' };
    const nestedChange = { action: 'set', scope: 'src', path: 'src/AGENTS.md' };
    const autoMessage = {
        id: 'auto-instructions',
        role: 'user',
        content: [
            {
                type: 'text',
                text: [
                    '<system-reminder>',
                    '',
                    'Instructions from: $DSH_HOME/AGENTS.md',
                    '',
                    'global guidance',
                    '',
                    'Instructions from: AGENTS.md',
                    '',
                    'root guidance',
                    '',
                    'Instructions from: src/AGENTS.md',
                    '',
                    'nested guidance',
                    '</system-reminder>'
                ].join('\n')
            }
        ],
        source: { kind: 'agent-instructions', form: 'instructions', custom: 'kept', changes: [globalChange, rootChange, nestedChange] }
    };
    const unrelatedMessage = {
        id: 'unrelated',
        role: 'user',
        content: [{ type: 'text', text: 'other context' }],
        source: { kind: 'other' }
    };
    const filtered = filterRootInstructionMessages([autoMessage, unrelatedMessage], ['AGENTS.md']);

    assert.equal(filtered.length, 2);
    const filteredAuto = filtered[0];
    const text = instructionText(filteredAuto);
    assert.ok(text);
    assert.equal(text.includes('root guidance'), false);
    assert.match(text, /nested guidance/);
    assert.match(text, /global guidance/);
    assert.ok(isFilteredInstructionMessage(filteredAuto));
    assert.deepEqual(filteredAuto.source.changes, [globalChange, nestedChange]);
    assert.equal(filteredAuto.source.kind, 'agent-instructions');
    assert.equal(filteredAuto.source.form, 'instructions');
    assert.equal(filteredAuto.source.custom, 'kept');
    assert.equal(filtered[1], unrelatedMessage);
    assert.deepEqual(
        filterRootInstructionMessages(
            [{ ...autoMessage, content: [{ type: 'text', text: 'unrecognized format with root guidance' }] }],
            ['AGENTS.md']
        ),
        []
    );
});

test('redirects selected instruction directories with frozen arguments only once', async () => {
    const harness = await createHarness({
        settings: {
            redirectInstructionDirectories: true,
            instructionDirectoryNames: ['.cursor', '.claude']
        }
    });
    try {
        const cursor = path.join(harness.projectRoot, '.cursor', 'rules', 'example.mdc');
        const claude = path.join(harness.projectRoot, '.claude', 'rules', 'example.mdc');
        assert.equal(await harness.run('read', cursor, harness.hook, undefined, true), 'isolated directory content');
        assert.equal(await harness.run('read', claude, harness.hook, undefined, true), 'isolated directory content');
        assert.equal(harness.state.activePaths.filter(item => item === 'agents/rules/example.mdc').length, 1);
        assert.equal(
            await harness.run('read', path.join(harness.projectRoot, '.other', 'rules', 'unmapped.mdc'), harness.hook, undefined, true),
            'private unmapped content'
        );
        assert.equal(
            await harness.run('read', path.join(harness.projectRoot, 'agents', 'rules', 'example.mdc'), harness.hook, undefined, true),
            'isolated directory content'
        );
    } finally {
        await harness.dispose();
    }
});

test('does not redirect disabled, unmatched, or already isolated reads', async () => {
    const settingsOff = await createHarness();
    try {
        assert.equal(await settingsOff.run('read', path.join(settingsOff.projectRoot, 'AGENTS.md')), 'private root content');
    } finally {
        await settingsOff.dispose();
    }

    const harness = await createHarness({
        settings: {
            redirectRootInstructionFiles: true,
            rootInstructionFileNames: ['AGENTS.md'],
            redirectInstructionDirectories: true,
            instructionDirectoryNames: ['.cursor', '.claude']
        }
    });
    try {
        assert.equal(
            await harness.run('read', path.join(harness.projectRoot, '.other', 'rules', 'unmapped.mdc')),
            'private unmapped content'
        );
        assert.equal(await harness.run('read', path.join(harness.projectRoot, 'agents', 'AGENTS.md')), 'isolated root content');
        assert.equal(await harness.run('read_image', path.join(harness.projectRoot, 'AGENTS.md')), 'private root content');
        const inactiveHook = createPreflightHook<string>(
            harness.ctx,
            harness.store,
            new Map<string, RouterState>(),
            harness.pendingFeedback
        );
        assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md'), inactiveHook), 'private root content');
    } finally {
        await harness.dispose();
    }
});

test('denies a matching read when its destination is missing without reading the source', async () => {
    const harness = await createHarness({
        settings: {
            redirectRootInstructionFiles: true,
            rootInstructionFileNames: ['AGENTS.md']
        }
    });
    try {
        await rm(path.join(harness.projectRoot, 'agents', 'AGENTS.md'));
        const result = await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md'));
        assert.ok(typeof result !== 'string');
        assert.equal(result.kind, 'deny');
        assert.match(result.reason, /could not safely redirect/);
        assert.equal(result.reason.includes('private root content'), false);
    } finally {
        await harness.dispose();
    }
});

test('denies a matching read when its destination symlink escapes agents', async context => {
    const harness = await createHarness({
        settings: {
            redirectInstructionDirectories: true,
            instructionDirectoryNames: ['.cursor']
        }
    });
    const link = path.join(harness.projectRoot, 'agents', 'rules', 'linked');
    try {
        const sourceDirectory = path.join(harness.projectRoot, '.cursor', 'rules', 'linked');
        const outsideDirectory = path.join(harness.projectRoot, 'outside-rules');
        await mkdir(sourceDirectory, { recursive: true });
        await mkdir(outsideDirectory);
        await writeFile(path.join(sourceDirectory, 'secret.mdc'), 'private source content', 'utf8');
        await writeFile(path.join(outsideDirectory, 'secret.mdc'), 'outside destination content', 'utf8');
        try {
            await symlink(outsideDirectory, link, 'junction');
        } catch (error) {
            if (
                process.platform === 'win32' &&
                error instanceof Error &&
                'code' in error &&
                typeof error.code === 'string' &&
                ['EACCES', 'EPERM'].includes(error.code)
            )
                return context.skip('directory junctions are unavailable');
            throw error;
        }
        let nextCalls = 0;
        const result = await harness.run('read', path.join(sourceDirectory, 'secret.mdc'), harness.hook, () => {
            nextCalls++;
            return 'private source content';
        });
        assert.ok(typeof result !== 'string');
        assert.equal(result.kind, 'deny');
        assert.equal(nextCalls, 0);
        assert.equal(result.reason.includes('private source content'), false);
    } finally {
        await rm(link, { recursive: true, force: true });
        await harness.dispose();
    }
});

test('keeps the original read when the area configuration is missing or invalid and reports a warning', async () => {
    for (const configText of [undefined, '{invalid']) {
        const harness = await createHarness({
            settings: { redirectRootInstructionFiles: true, rootInstructionFileNames: ['AGENTS.md'] },
            configText
        });
        try {
            assert.equal(await harness.run('read', path.join(harness.projectRoot, 'AGENTS.md')), 'private root content');
            assert.ok([...harness.state.runtimeDiagnostics.values()].some(({ code }) => code === 'instruction-redirection-config'));
        } finally {
            await harness.dispose();
        }
    }
});
