import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

test('client bundle registers under the package name expected by the host', async () => {
  const root = new URL('../', import.meta.url)
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const source = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.match(source, /\.ar-tabs\{[^}]*display:inline-flex[^}]*width:max-content[^}]*max-width:100%[^}]*padding:5px 6px/)
  assert.match(source, /\.ar-tabs button\.selected\{[^}]*border-color:var\(--ar-border\)/)
  assert.match(source, /"nav", \{ className: "ar-tabs", role: "tablist", "aria-label": t\("router"\), children:/)
  assert.match(source, /"button", \{ role: "tab", "aria-selected": tab === key,[^\n]*onClick: \(\) => setTab\(key\)/)
  assert.match(source, /updateProject\("rootInstructionFileNames", parseNameList\(event.target.value\)\)/)
  assert.match(source, /updateProject\("instructionDirectoryNames", parseNameList\(event.target.value\)\)/)
  assert.match(source, /rootInstructionFileNames: cleanNameList\(settings.rootInstructionFileNames\)/)
  assert.match(source, /instructionDirectoryNames: cleanNameList\(settings.instructionDirectoryNames\)/)
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-renderer'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-plugin-manager'))
  assert.ok(!pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-slots'))
  const registrations = []
  runInNewContext(source, { window: { __ModuleLoader__: { load: (entry) => registrations.push(entry) } } })
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].id, pkg.name)
  const settings = { locale: 'ru', theme: 'auto', pollingIntervalMs: 3000, globalLogging: false }
  const stateValues = [settings, '', '', false]
  let stateIndex = 0
  const client = registrations[0].factory((id) => {
    assert.ok(['react', 'react/jsx-runtime'].includes(id))
    return id === 'react/jsx-runtime' ? {
      jsx: (tag, props) => ({ tag, props }),
      jsxs: (tag, props) => ({ tag, props }),
    } : {
      useState: () => [stateValues[stateIndex++], () => {}],
      useEffect: () => {},
    }
  })
  const slots = []
  const tabs = []
  // The client runner rejects reading a service that was not declared in inject.
  const ctx = new Proxy({
    locale: { preference: 'en' },
    slots: {
      inject: (slot, callback) => { slots.push(slot); return callback() },
      register: (options, component) => {
        if (options.name === 'plugins.bundle.config' && !options.key) {
          throw new Error(`keyed slot "${options.name}" requires options.key`)
        }
        tabs.push({ ...options, component })
      },
    },
  }, {
    get(target, property) {
      if (typeof property === 'string' && !client.inject.includes(property)) {
        throw new Error(`cannot get property "${property}" without inject`)
      }
      return target[property]
    },
  })
  client.apply(ctx)
  assert.deepEqual(slots, ['conversation.view', 'plugins.detail.actions', 'plugins.bundle.config'])
  assert.equal(tabs.length, 3)
  assert.equal(tabs[0].id, 'agents-router')
  assert.equal(tabs[0].label(), 'Router')
  assert.equal(tabs[1].id, 'agents-router-settings-action')
  assert.equal(tabs[1].component({ subject: { kind: 'bundle', pkg: { name: '@other/plugin' } } }), null)
  assert.equal(tabs[1].component({ subject: { kind: 'row', pkg: { name: pkg.name } } }), null)
  const settingsAction = tabs[1].component({ subject: { kind: 'bundle', pkg: { name: pkg.name } } })
  assert.equal(settingsAction.tag, 'button')
  assert.equal(settingsAction.props.children[1], 'Settings')
  assert.equal(tabs[2].id, 'agents-router-global-settings')
  assert.equal(tabs[2].key, pkg.name)
  const view = tabs[2].component()
  assert.equal(view.tag, 'div')
  assert.equal(view.props.className, 'ar-settings-root')
  const [style, card] = view.props.children
  assert.equal(style.tag, 'style')
  assert.match(style.props.children, /\.ar-settings-row\{/)
  assert.match(style.props.children, /\.ar-settings-jump\{[^}]*height:28px/)
  assert.match(style.props.children, /\.ar-settings-switch\{[^}]*width:36px;height:20px/)
  assert.match(style.props.children, /--dsw-alias-brand-primary/)
  assert.equal(card.tag, 'section')
  assert.equal(card.props.className, 'ar-settings-card')
  const nodes = []
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (value && typeof value === 'object') {
      if ('tag' in value) nodes.push(value)
      visit(value.props?.children)
    }
  }
  visit(card)
  assert.equal(nodes.filter((node) => node.props?.className === 'ar-settings-row').length, 4)
  assert.equal(nodes.filter((node) => node.props?.role === 'switch').length, 1)
  assert.ok(nodes.some((node) => node.props?.children === 'Сбросить по умолчанию'))
})
