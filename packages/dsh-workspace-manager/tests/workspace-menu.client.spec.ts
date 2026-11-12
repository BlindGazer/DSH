// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installWorkspaceMenu } from '../src/client/features/manage-workspaces/services/workspaceMenuAdapter.js'
import type { WorkspaceEditTarget } from '../src/client/features/manage-workspaces/models/WorkspaceEditTarget.js'

let dispose: (() => void) | undefined
afterEach(() => { dispose?.(); dispose = undefined; document.body.replaceChildren() })
const flush = async () => { await new Promise<void>(resolve => queueMicrotask(resolve)) }

function queryElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Expected an element matching ${selector}`)
  return element
}

function queryOptional<T extends Element>(selector: string): T | undefined {
  return document.querySelector<T>(selector) ?? undefined
}

function disposeMenu(): void {
  const cleanup = dispose
  if (cleanup === undefined) throw new Error('The workspace menu adapter is not installed')
  cleanup()
}

function anchor(key: string): HTMLButtonElement {
  return queryElement<HTMLButtonElement>(`[data-row-key="workspace:${key}"] button`)
}

function show(button: HTMLButtonElement): void {
  button.addEventListener('click', () => {
    const existing = queryOptional('[role="menu"]')
    if (existing) { existing.remove(); return }
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    menu.innerHTML = '<div role="presentation"><div class="native-wrap"><button role="menuitem" class="native-item"><span><svg></svg></span><span>Rename</span></button></div><div><button role="menuitem">Delete</button></div></div>'
    document.body.append(menu)
  })
  button.click()
}

function setup() {
  document.body.innerHTML = '<div data-row-key="workspace:one"><button>Actions</button><button>New Session</button></div><div data-row-key="workspace:two"><button>Actions</button></div><div data-row-key="session:one"><button>Actions</button></div>'
  const targets: Record<string, WorkspaceEditTarget> = {
    one: { workspaceId: 'one', displayTitle: 'One', path: '/one' },
    two: { workspaceId: 'two', displayTitle: 'Two', path: '/two' },
  }
  const open = vi.fn()
  dispose = installWorkspaceMenu(document, { label: () => '编辑', resolve: key => targets[key], open })
  return { targets, open, anchor, show }
}

describe('workspace menu adapter', () => {
  it('converts the native Rename row to Edit, closes the menu, and resolves fresh Workspace data', async () => {
    const state = setup()
    state.show(state.anchor('one'))
    await flush()
    expect([...document.querySelectorAll('[role="menuitem"]')].map(row => row.textContent)).toEqual(['编辑', 'Delete'])
    const edit = queryElement<HTMLButtonElement>('[data-addir-menu] button')
    expect(edit.className).toBe('native-item')
    expect(Boolean(queryOptional('svg'))).toBe(true)
    expect(document.querySelectorAll('[data-addir-menu]')).toHaveLength(1)
    document.body.append(document.createElement('div'))
    await flush()
    expect(document.querySelectorAll('[data-addir-menu]')).toHaveLength(1)
    const target = state.targets.one
    if (!target) throw new Error('The test workspace target is missing')
    state.targets.one = { ...target, displayTitle: 'Updated' }
    edit.click()
    await flush()
    expect(queryOptional('[role="menu"]')).toBeUndefined()
    expect(state.open).toHaveBeenCalledWith(state.targets.one)
    state.show(state.anchor('two'))
    await flush()
    queryElement<HTMLButtonElement>('[data-addir-menu] button').click()
    await flush()
    expect(state.open).toHaveBeenLastCalledWith(state.targets.two)
  })

  it('keeps the Edit entry when upstream adds workspace menu actions', async () => {
    const state = setup()
    state.show(state.anchor('one'))
    queryElement('[role="menu"] [role="presentation"]').insertAdjacentHTML('beforeend', '<div><button role="menuitem">Show in folder</button></div>')
    await flush()
    expect([...document.querySelectorAll('[role="menuitem"]')].map(row => row.textContent)).toEqual(['编辑', 'Delete', 'Show in folder'])
  })

  it('ignores session menus and the Workspace New Session button', async () => {
    const state = setup()
    state.show(queryElement<HTMLButtonElement>('[data-row-key="session:one"] button'))
    await flush()
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
    queryElement('[role="menu"]').remove()
    state.show(queryElement<HTMLButtonElement>('[data-row-key="workspace:one"] button:nth-child(2)'))
    await flush()
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
  })

  it('removes contributions on disposal and suppresses a queued editor activation', async () => {
    const state = setup()
    state.show(state.anchor('one'))
    await flush()
    queryElement<HTMLButtonElement>('[data-addir-menu] button').click()
    disposeMenu()
    await flush()
    expect(state.open).not.toHaveBeenCalled()
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
    state.show(state.anchor('one'))
    await flush()
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
  })

  it('restores the native Rename row when disposed while the menu is open', async () => {
    const state = setup()
    state.show(state.anchor('one'))
    await flush()
    disposeMenu()
    dispose = undefined
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
    expect(queryOptional('[role="menuitem"]')?.textContent).toBe('Rename')
  })

  it('leaves unmapped Workspace ids and incompatible menu structures unchanged', async () => {
    const state = setup()
    delete state.targets.one
    state.show(state.anchor('one'))
    await flush()
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
    queryElement('[role="menu"]').remove()
    state.show(state.anchor('two'))
    queryElement('[role="menuitem"]').remove()
    await flush()
    expect(queryOptional('[data-addir-menu]')).toBeUndefined()
  })
})
