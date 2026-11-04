import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8')
const ignore = await readFile(resolve(root, '.gitignore'), 'utf8')
const failures = []
const check = async (label, fn) => {
  try { await fn(); console.log(`OK ${label}`) } catch (error) { failures.push(`${label}: ${error.message}`) }
}

const targets = new Set()
for (const entry of Object.values(pkg.exports || {})) {
  if (typeof entry === 'string') targets.add(entry)
  else if (entry && typeof entry === 'object') for (const target of Object.values(entry)) if (typeof target === 'string') targets.add(target)
}
for (const match of patch.matchAll(/name:\s*["']?\.\/([^\s"']+)/g)) targets.add(`./${match[1]}`)
for (const target of targets) {
  await check(`non-empty ${target}`, async () => {
    const data = await readFile(resolve(root, target), 'utf8')
    assert.ok(data.trim().length, `${target} is empty`)
  })
}
await check('lib is not ignored', () => assert.doesNotMatch(ignore, /^\/?lib\/?\s*$/m))
await check('lib is included in package files', () => assert.ok(pkg.files?.includes('lib')))

const nodeEntryPath = resolve(root, 'lib/index.js')
const nodeFiles = ['index.js', 'controller.js', 'crypto-store.js', 'config-normalizer.js', 'storage.js', 'http-routes.js', 'providers.js', 'provider-endpoints.js', 'provider-hosts.js', 'provider-yaml.js', 'provider-discovery.js', 'provider-routing.js', 'dispatcher.js', 'undici-loader.js', 'socks5.js', 'profile-dispatcher.js', 'connection-test.js']
const nodeSources = new Map()
for (const filename of nodeFiles) {
  const sourcePath = resolve(root, 'src/node', filename)
  const outputPath = resolve(root, 'lib', filename)
  const [source, output] = await Promise.all([readFile(sourcePath, 'utf8'), readFile(outputPath, 'utf8')])
  nodeSources.set(filename, output)
  await check(`fresh Node output ${filename}`, () => assert.equal(output, source))
}
await check('all relative Node imports resolve', () => {
  for (const [filename, source] of nodeSources) {
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) {
      const specifier = match[1]
      assert.ok(specifier.endsWith('.js'), `${filename} uses extensionless relative import ${specifier}`)
      const target = resolve(root, 'lib', specifier.startsWith('./') ? specifier.slice(2) : specifier)
      assert.ok(nodeFiles.includes(specifier.replace(/^\.\//, '')), `${filename} references an unlisted module ${specifier}`)
      assert.ok(nodeSources.has(specifier.replace(/^\.\//, '')), `${filename} is missing dependency ${target}`)
    }
  }
})
await check('Node exports are declared in index.d.ts', async () => {
  const runtime = nodeSources.get('index.js')
  const declarations = await readFile(resolve(root, 'lib/index.d.ts'), 'utf8')
  const runtimeNames = new Set()
  for (const match of runtime.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)) runtimeNames.add(match[1])
  for (const match of runtime.matchAll(/export\s*\{([^}]+)\}\s*from/g)) {
    for (const item of match[1].split(',')) {
      const parts = item.trim().split(/\s+as\s+/)
      if (parts[0]) runtimeNames.add(parts.at(-1).trim())
    }
  }
  const declaredNames = new Set([...declarations.matchAll(/export\s+declare\s+(?:function|const|class|interface|type)\s+(\w+)/g)].map((match) => match[1]))
  const missing = [...runtimeNames].filter((name) => !declaredNames.has(name))
  assert.deepEqual(missing, [], `missing declarations: ${missing.join(', ')}`)
})

const clientPath = resolve(root, 'lib/client.js')
const clientCode = await readFile(clientPath, 'utf8')
await check('client bundle parses', () => new vm.Script(clientCode, { filename: clientPath }))
let registration
const documentMock = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: { appendChild() {} },
  body: { appendChild() {}, removeChild() {} },
  addEventListener() {},
  removeEventListener() {},
}
const windowMock = { __ModuleLoader__: { load: (entry) => { registration = entry } }, addEventListener() {}, removeEventListener() {} }
const sandbox = {
  window: windowMock,
  document: documentMock,
  URL,
  fetch: async () => ({ ok: true, json: async () => ({ ok: true, config: { profiles: [], providerBindings: {} }, providers: [], conflicts: [], routes: {} }) }),
  setInterval: () => 1,
  clearInterval() {},
  console,
}
vm.runInNewContext(clientCode, sandbox, { filename: clientPath })
await check('one ModuleLoader registration with package id', () => {
  assert.equal(registration?.id, pkg.name)
  assert.equal(typeof registration?.factory, 'function')
})
if (registration) {
  const react = {
    useState: (value) => [value, () => {}],
    useEffect() {},
    useRef: (current) => ({ current }),
    useCallback: (fn) => fn,
  }
  const jsxRuntime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: Symbol.for('fragment') }
  const client = registration.factory((id) => id === 'react' ? react : id === 'react/jsx-runtime' ? jsxRuntime : {})
  const registrations = []
  const slots = {
    inject: (_slot, callback) => callback(),
    register: (options, component) => { registrations.push({ options, component }); return () => {} },
  }
  const allowed = new Set(client.inject || [])
  const rawContext = { slots }
  const strictContext = new Proxy(rawContext, {
    get(target, key, receiver) {
      if (typeof key === 'string' && !allowed.has(key)) throw new Error(`undeclared ctx property: ${key}`)
      return Reflect.get(target, key, receiver)
    },
  })
  await check('apply reads only injected context properties', () => client.apply(strictContext))
  await check('client context inject and package dependencies are declared', () => {
    assert.ok(Array.isArray(client.inject) && client.inject.includes('slots'))
    assert.ok(Array.isArray(pkg.dsh.client.inject) && pkg.dsh.client.inject.every((item) => typeof item === 'string'))
  })
  await check('settings.models.provider-card is registered with keyed options', () => {
    assert.ok(registrations.some(({ options }) => options.name === 'settings.models.provider-card' && typeof options.key === 'string'))
  })
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join('\n'))
  process.exitCode = 1
} else console.log('Release verification OK')
