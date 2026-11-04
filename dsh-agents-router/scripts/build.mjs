import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const lib = resolve(root, 'lib')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
await mkdir(lib, { recursive: true })

const external = [...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.dependencies || {})]
const clientExternal = [
  'react', 'react/jsx-runtime',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-plugin-manager',
  '@deepseek-ai/dsh-client-ui-renderer',
]

const common = { bundle: true, sourcemap: true, logLevel: 'info' }
const platformPackage = `${process.platform}-${process.arch}`
const binaryName = process.platform === 'win32' ? 'esbuild.exe' : 'bin/esbuild'
const directBinary = resolve(root, 'node_modules', '@esbuild', platformPackage, binaryName)
const pnpmStore = resolve(root, 'node_modules', '.pnpm')
const pnpmBinaries = existsSync(pnpmStore)
  ? readdirSync(pnpmStore).filter((name) => name.startsWith(`@esbuild+${platformPackage}@`))
    .map((name) => resolve(pnpmStore, name, 'node_modules', '@esbuild', platformPackage, binaryName))
  : []
const esbuildBinary = [directBinary, ...pnpmBinaries].find(existsSync) ?? directBinary

function buildDirectly(options) {
  if (!existsSync(esbuildBinary)) throw new Error(`direct esbuild binary is missing: ${esbuildBinary}`)
  const args = [...options.entryPoints, `--outfile=${options.outfile}`]
  for (const flag of ['platform', 'format', 'target', 'jsx']) if (options[flag]) args.push(`--${flag}=${options[flag]}`)
  if (options.bundle) args.push('--bundle')
  if (options.sourcemap) args.push('--sourcemap')
  for (const item of options.external ?? []) args.push(`--external:${item}`)
  for (const [kind, value] of Object.entries(options.banner ?? {})) args.push(`--banner:${kind}=${value}`)
  for (const [kind, value] of Object.entries(options.footer ?? {})) args.push(`--footer:${kind}=${value}`)
  const result = spawnSync(esbuildBinary, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`direct esbuild binary exited with status ${result.status}`)
}

async function buildWithFallback(options) {
  if (process.env.DSH_FORCE_ESBUILD_CLI === '1') {
    console.warn('Using the direct esbuild binary by request.')
    return buildDirectly(options)
  }
  try {
    await build(options)
  } catch (error) {
    if (error?.code !== 'EPERM' && error?.cause?.code !== 'EPERM') throw error
    console.warn('esbuild API spawn denied; retrying with the direct esbuild binary.')
    buildDirectly(options)
  }
}

await buildWithFallback({
  ...common,
  entryPoints: [resolve(root, 'src/index.js')],
  outfile: resolve(lib, 'index.js'),
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external,
})

await buildWithFallback({
  ...common,
  entryPoints: [resolve(root, 'src/client/index.jsx')],
  outfile: resolve(lib, 'client.js'),
  platform: 'browser',
  format: 'cjs',
  target: 'es2024',
  jsx: 'automatic',
  external: clientExternal,
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;` },
  footer: { js: 'return module.exports; } });' },
})

const indexDts = `export declare const name: string;\nexport declare const inject: string[];\nexport declare function apply(ctx: unknown): void;\n`
const clientDts = `export declare const name: string;\nexport declare const inject: string[];\nexport declare function apply(ctx: unknown): void;\n`
await writeFile(resolve(lib, 'index.d.ts'), indexDts, 'utf8')
await writeFile(resolve(lib, 'client.d.ts'), clientDts, 'utf8')
console.log(`Built ${resolve(lib, 'index.js')} and ${resolve(lib, 'client.js')}`)
