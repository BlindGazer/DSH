import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { assert, test } from 'vitest';

type RuntimeValue =
    | string
    | boolean
    | number
    | symbol
    | RuntimeObject
    | RuntimeValue[]
    | ((...args: never[]) => RuntimeValue | undefined)
    | undefined;
interface RuntimeObject {
    [key: string]: RuntimeValue;
}
interface RuntimeClient {
    inject: string[];
    apply(context: RuntimeObject): void;
}
interface ModuleRegistration {
    id: string;
    factory(load: (id: string) => RuntimeObject): RuntimeClient;
}
interface PackageManifest {
    name: string;
    dependencies: { react?: string; 'react-compiler-runtime'?: string };
    dsh: { client: { inject: string[] } };
}
function mockReactComponent(): RuntimeValue {
    return undefined;
}

interface RenderedElement extends RuntimeObject {
    tag: string;
    props: RuntimeObject;
}

const asElement = (value: RuntimeValue): RenderedElement => {
    if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'tag' in value &&
        typeof value.tag === 'string' &&
        'props' in value
    ) {
        return value as RenderedElement;
    }
    throw new Error('expected a rendered element');
};

interface SlotRegistration {
    id?: string;
    name?: string;
    key?: string;
    label?: () => string;
    component(props: RuntimeObject): RuntimeValue;
}

test('client bundle registers under the package name expected by the host', async () => {
    const root = new URL('../', import.meta.url);
    const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as PackageManifest;
    const source = await readFile(new URL('lib/client.js', root), 'utf8');
    const styles = await readFile(new URL('lib/dsh-agents-router.css', root), 'utf8');
    assert.equal(pkg.dependencies.react, '^18.0.0 || ^19.0.0', 'React 18 and 19 must be supported');
    assert.equal(pkg.dependencies['react-compiler-runtime'], '^1.0.0', 'React Compiler runtime must be installed with the package');
    assert.ok(source.includes('e("react")'), 'React must be resolved from the host runtime');
    assert.ok(source.includes('e("react/jsx-runtime")'), 'React JSX runtime must be resolved from the host runtime');
    assert.ok(source.includes('memo_cache_sentinel'), 'React Compiler optimization must remain enabled');
    assert.match(styles, /\.ar-tabs\{[^}]*display:inline-flex/);
    assert.match(styles, /\.ar-tabs\{[^}]*width:max-content/);
    assert.match(styles, /\.ar-tabs\{[^}]*max-width:100%/);
    assert.match(styles, /\.ar-tabs\{[^}]*padding:5px 6px/);
    assert.match(styles, /\.ar-tabs button\.selected,[^}]*border-color:var\(--ar-border\)/);
    assert.ok(source.includes('`ar-tabs`'));
    assert.ok(source.includes('`tablist`'));
    assert.ok(source.includes('"aria-selected"'));
    assert.ok(source.includes('rootInstructionFileNames'));
    assert.ok(source.includes('instructionDirectoryNames'));
    assert.ok(source.includes('AGENTS.md'));
    assert.ok(source.includes('.cursor'));
    assert.ok(source.includes('.claude'));
    assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'));
    assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-renderer'));
    assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-plugin-manager'));
    assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-slots'));
    const registrations: ModuleRegistration[] = [];
    runInNewContext(source, {
        window: { __ModuleLoader__: { load: (entry: ModuleRegistration) => registrations.push(entry) } },
        process: { env: { NODE_ENV: 'production' } }
    });
    assert.equal(registrations.length, 1);
    const registration = registrations[0];
    assert.ok(registration);
    assert.equal(registration.id, pkg.name);
    const moduleRequests = new Set<string>();
    const stateValues: RuntimeValue[] = [{ locale: 'ru', theme: 'auto', pollingIntervalMs: 3000, globalLogging: false }, '', '', false];
    let stateIndex = 0;
    const reactInternals = {
        ReactCurrentDispatcher: {
            current: {
                useMemoCache: (size: number) => Array.from({ length: size }, () => Symbol.for('react.memo_cache_sentinel'))
            }
        }
    };
    const client = registration.factory(id => {
        moduleRequests.add(id);
        if (id === 'react/jsx-runtime') {
            return {
                jsx: (tag: string, props: RuntimeObject) => ({ tag, props }),
                jsxs: (tag: string, props: RuntimeObject) => ({ tag, props })
            };
        }
        assert.equal(id, 'react');
        return {
            __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: reactInternals,
            Component: mockReactComponent,
            useState: (initial?: RuntimeValue) => [initial === undefined ? stateValues[stateIndex++] : initial, () => {}],
            useEffect: () => {},
            useCallback: <Callback extends (...args: never[]) => RuntimeValue>(callback: Callback) => callback,
            useSyncExternalStore: (_subscribe: (callback: () => void) => () => void, getSnapshot: () => RuntimeValue) => getSnapshot(),
            useMemo: <Value>(fn: () => Value) => fn(),
            useRef: () => ({ current: undefined })
        };
    });
    assert.ok(moduleRequests.has('react'));
    assert.ok(moduleRequests.has('react/jsx-runtime'));
    const slots: string[] = [];
    const tabs: SlotRegistration[] = [];
    // The client runner rejects reading a service that was not declared in inject.
    const proxyTarget: RuntimeObject = {
        locale: { preference: 'en' },
        slots: {
            inject: (slot: string, callback: () => RuntimeValue) => {
                slots.push(slot);
                return callback();
            },
            register: (options: SlotRegistration, component: SlotRegistration['component']) => {
                if (options.name === 'plugins.bundle.config' && !options.key) {
                    throw new Error(`keyed slot "${options.name}" requires options.key`);
                }
                tabs.push({ ...options, component });
            }
        }
    };
    const ctx = new Proxy(proxyTarget, {
        get(target, property) {
            if (typeof property === 'string' && !client.inject.includes(property)) {
                throw new Error(`cannot get property "${property}" without inject`);
            }
            return typeof property === 'string' ? target[property] : undefined;
        }
    });
    client.apply(ctx);
    assert.deepEqual(slots, ['conversation.view', 'plugins.detail.actions', 'plugins.bundle.config']);
    assert.equal(tabs.length, 3);
    const mainTab = tabs[0];
    const actionTab = tabs[1];
    const settingsTab = tabs[2];
    assert.ok(mainTab);
    assert.ok(actionTab);
    assert.ok(settingsTab);
    assert.equal(mainTab.id, 'agents-router');
    assert.ok(mainTab.label);
    assert.equal(mainTab.label(), 'Router');
    assert.equal(actionTab.id, 'agents-router-settings-action');
    assert.equal(Boolean(actionTab.component({ subject: { kind: 'bundle', pkg: { name: '@other/plugin' } } })), false);
    const rowAction = actionTab.component({ subject: { kind: 'row', pkg: { name: pkg.name } } });
    assert.ok(rowAction);
    const rowActionChildren = (rowAction as RuntimeObject).props as RuntimeObject;
    const settingsAction = asElement((rowActionChildren.children as RuntimeValue[])[0]);
    assert.equal(settingsAction.tag, 'button');
    const actionChildren = settingsAction.props.children as RuntimeValue[];
    assert.equal(actionChildren[1], 'Settings');
    assert.equal(settingsTab.id, 'agents-router-global-settings');
    assert.equal(settingsTab.key, pkg.name);
    const view = asElement(settingsTab.component({ isModal: false, onClose: () => {} }));
    assert.equal(view.tag, 'div');
    assert.match(String(view.props.className), /\bar-settings-root\b/);
    const [styleValue, cardValue] = view.props.children as RuntimeValue[];
    const style = asElement(styleValue);
    const card = asElement(cardValue);
    assert.equal(style.tag, 'style');
    assert.match(style.props.children as string, /\.ar-settings-row\{/);
    assert.match(style.props.children as string, /\.ar-settings-jump\{[^}]*height:28px/);
    assert.match(style.props.children as string, /\.ar-settings-switch\{[^}]*width:36px;height:20px/);
    assert.match(style.props.children as string, /\.ar-settings-modal-backdrop\{[^}]*position:fixed/);
    assert.match(style.props.children as string, /--dsh-ui-accent/);
    assert.equal(card.tag, 'section');
    assert.equal(card.props.className, 'ar-settings-card');
    const nodes: RenderedElement[] = [];
    const visit = (value: RuntimeValue): void => {
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (value && typeof value === 'object') {
            if ('tag' in value) nodes.push(value as RenderedElement);
            const props = value.props;
            if (props && typeof props === 'object' && !Array.isArray(props)) visit(props.children);
        }
    };
    visit(card);
    assert.equal(nodes.filter(node => node.props.className === 'ar-settings-row').length, 4);
});
