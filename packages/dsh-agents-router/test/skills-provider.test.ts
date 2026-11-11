import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';
import { registerSkillsProvider } from '../src/host/services/skillsProvider.js';
import { RouterStore } from '../src/host/services/store.js';

interface SkillCandidate {
    path: string;
    name: string;
    description: string | undefined;
    whenToUse?: string;
    invocation?: { modelInvocable?: boolean; userInvocable?: boolean } | undefined;
    source: 'project-agents';
    provider: string;
    resourceBase: { kind: 'directory'; path: string };
    rank: number;
    locator: { name: string; sourcePath: string };
}

interface SkillDefinition {
    path: string;
    name: string;
    description: string | undefined;
    whenToUse?: string;
    invocation?: { modelInvocable?: boolean; userInvocable?: boolean } | undefined;
    source: 'project-agents';
    provider: string;
    resourceBase: { kind: 'directory'; path: string };
    content: string | undefined;
}

interface SkillProvider {
    name: string;
    list(options: { signal?: AbortSignal }): Promise<{ complete: boolean; candidates: readonly SkillCandidate[] }>;
    get(candidate: SkillCandidate, options: { signal?: AbortSignal }): Promise<SkillDefinition | undefined>;
}

interface GlobalSkill {
    name: string;
    provider?: string;
    path?: string;
}

const projectRoot = fileURLToPath(new URL('../examples/demo-project', import.meta.url));

function scopedAgent(setProvider: (provider: SkillProvider) => void) {
    return {
        ctx: {
            async inject(
                services: readonly string[],
                apply: (scope: {
                    skills: {
                        registerProvider: (create: (control: { signal: AbortSignal; invalidate: () => void }) => SkillProvider) => void;
                    };
                }) => void
            ) {
                assert.deepEqual(services, ['skills']);
                apply({
                    skills: {
                        registerProvider: create => {
                            setProvider(create({ signal: new AbortController().signal, invalidate: () => {} }));
                        }
                    }
                });
            }
        }
    };
}

test('uses the native provider contract and defers bodies until get()', async () => {
    const providers: SkillProvider[] = [];
    const agent = scopedAgent(value => {
        providers.push(value);
    });
    const rootContext = { skills: { list: async (_options: { cwd: string; signal?: AbortSignal }) => [] as GlobalSkill[] } };
    const store = new RouterStore(path.join(tmpdir(), `dsh-router-skills-${randomUUID()}`));
    await registerSkillsProvider(agent, rootContext, projectRoot, store);
    const provider = providers[0];
    assert.ok(provider);
    const result = await provider.list({ signal: new AbortController().signal });
    assert.equal(result.complete, true);
    const skill = result.candidates.find(({ name }) => name === 'review');
    assert.ok(skill);
    assert.ok(skill.locator);
    assert.equal(Object.hasOwn(skill, 'content'), false);
    const definition = await provider.get(skill, { signal: new AbortController().signal });
    const content = definition?.content;
    assert.ok(content);
    assert.match(content, /Review the supplied diff/);
});

test('does not shadow a name already visible in the global skill registry', async () => {
    const providers: SkillProvider[] = [];
    const agent = scopedAgent(value => {
        providers.push(value);
    });
    const rootContext = {
        skills: { list: async (_options: { cwd: string; signal?: AbortSignal }) => [{ name: 'review' }] as GlobalSkill[] }
    };
    const store = new RouterStore(path.join(tmpdir(), `dsh-router-skills-${randomUUID()}`));
    await registerSkillsProvider(agent, rootContext, projectRoot, store);
    const provider = providers[0];
    assert.ok(provider);
    const result = await provider.list({ signal: new AbortController().signal });
    assert.equal(
        result.candidates.some(({ name }) => name === 'review'),
        false
    );
    assert.equal(
        result.candidates.some(({ name }) => name === 'front-review'),
        true
    );
});
