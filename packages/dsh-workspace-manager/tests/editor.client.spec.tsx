// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkspaceAddirModal, type WorkspaceEditorProps } from '../src/client/features/manage-workspaces/components/WorkspaceAddirModal.js'
import { fetchWorkspaceDirectories, replaceWorkspaceDirectories } from '../src/client/features/manage-workspaces/services/addirApi.js'
import { ru } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.js'

vi.mock('../src/client/features/manage-workspaces/services/addirApi.js', () => ({ fetchWorkspaceDirectories: vi.fn(), replaceWorkspaceDirectories: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

function editor(overrides: Partial<WorkspaceEditorProps> = {}) {
  const props: WorkspaceEditorProps = {
    target: { workspaceId: 'project', displayTitle: 'Project', path: '/projects/main' },
    onClose: vi.fn(), rename: vi.fn(async () => {}), removeWorkspace: vi.fn(async () => {}),
    pick: vi.fn(async () => '/projects/shared'), t: key => ru[key], ...overrides,
  }
  render(<WorkspaceAddirModal {...props} />)
  return props
}
async function loaded() { await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить' }).hasAttribute('disabled')).toBe(false)) }

describe('project editor', () => {
  it('calls the native picker directly and commits the complete draft only on Save', async () => {
    vi.mocked(fetchWorkspaceDirectories).mockResolvedValue([])
    vi.mocked(replaceWorkspaceDirectories).mockResolvedValue()
    const props = editor()
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить каталог' }))
    await screen.findByText('shared')
    expect(props.pick).toHaveBeenCalledOnce()
    expect(screen.queryByRole('textbox', { name: '文件夹路径' })).toBeNull()
    expect(replaceWorkspaceDirectories).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Только чтение' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Название проекта' }), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce())
    expect(props.rename).toHaveBeenCalledWith(props.target.workspaceId, 'Updated')
    expect(replaceWorkspaceDirectories).toHaveBeenCalledWith('/projects/main', [{ path: '/projects/shared', alias: '', readOnly: true }])
  })

  it('leaves saved associations unchanged when selection or editing is cancelled', async () => {
    vi.mocked(fetchWorkspaceDirectories).mockResolvedValue([{ path: '/projects/saved', alias: 'saved', readOnly: false }])
    const props = editor({ pick: vi.fn(async () => undefined) })
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить каталог' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Добавить каталог' }).hasAttribute('disabled')).toBe(false))
    expect(screen.getByText('saved')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить каталог: saved' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(props.onClose).toHaveBeenCalledOnce()
    expect(replaceWorkspaceDirectories).not.toHaveBeenCalled()
    expect(props.rename).not.toHaveBeenCalled()
  })

  it('keeps the draft open and restores the title when association persistence fails', async () => {
    vi.mocked(fetchWorkspaceDirectories).mockResolvedValue([])
    vi.mocked(replaceWorkspaceDirectories).mockRejectedValue(new Error('Disk is unavailable'))
    const props = editor()
    await loaded()
    fireEvent.change(screen.getByRole('textbox', { name: 'Название проекта' }), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Disk is unavailable')
    expect(props.rename).toHaveBeenNthCalledWith(1, props.target.workspaceId, 'Updated')
    expect(props.rename).toHaveBeenNthCalledWith(2, props.target.workspaceId, 'Project')
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('blocks Save after a load failure instead of replacing unread associations with an empty list', async () => {
    vi.mocked(fetchWorkspaceDirectories).mockRejectedValue(new Error('HTTP 404'))
    editor()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'HTTP 404')
    expect(screen.getByRole('button', { name: 'Сохранить' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy()
    expect(replaceWorkspaceDirectories).not.toHaveBeenCalled()
  })
})
