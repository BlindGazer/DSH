import { describe, expect, it } from 'vitest'
import type { ToolRunContext, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createAddTool, createListTool, createRemoveTool } from '../src/host/tools/workspaceDirectoryTools.js'
import { WorkspaceDirectoriesServiceImpl } from '../src/host/services/WorkspaceDirectoriesService.js'
import { resolveConfig } from '../src/host/config.js'

type ToolJsonValue = string | number | boolean | ToolJsonValue[] | { readonly [key: string]: ToolJsonValue }

describe('agent tools', () => {
  const testRoot = join(tmpdir(), `dsh-test-tools-${Date.now()}`)
  mkdirSync(testRoot, { recursive: true })
  const mainDir = join(testRoot, 'main')
  const extDir = join(testRoot, 'ext')
  mkdirSync(mainDir, { recursive: true })
  mkdirSync(extDir, { recursive: true })
  const callId = 'test-call' as ToolCallId
  const mockExec: ToolRunContext = {
    callId,
    rootCallId: callId,
    name: 'test-tool',
    arguments: {},
    token: Symbol('execution') as ToolExecutionToken,
    signal: new AbortController().signal,
    deferContext: () => undefined,
    concludeTurn: () => undefined,
  }

  it('lists directories with createListTool', async () => {
    const service = new WorkspaceDirectoriesServiceImpl(resolveConfig(), mainDir)
    const listTool = createListTool(service)
    expect(listTool.name).toBe('addir_list')

    const result = await listTool.execute({}, mockExec)
    expect(result).toHaveLength(1)

    const rendered = listTool.output?.render?.({}, result as ToolJsonValue)
    const block = rendered?.[0]
    expect(block?.type).toBe('text')
    if (block?.type === 'text') {
      expect(block.text).toContain('### Associated Workspace Directories:')
      expect(block.text).toContain('(Primary Root)')
    }
  })

  it('adds and removes directories with tools', async () => {
    const service = new WorkspaceDirectoriesServiceImpl(resolveConfig(), mainDir)
    const addTool = createAddTool(service)
    const removeTool = createRemoveTool(service)
    expect(addTool.name).toBe('addir_add')
    expect(removeTool.name).toBe('addir_remove')

    const addResult = await addTool.execute({
      path: extDir,
      alias: 'extension',
      description: 'Extension modules',
      readOnly: true,
    }, mockExec)
    expect(service.get('extension')?.alias).toBe('extension')
    expect(service.get('extension')?.readOnly).toBe(true)

    const addRendered = addTool.output?.render?.({}, addResult as ToolJsonValue)
    const addBlock = addRendered?.[0]
    expect(addBlock?.type).toBe('text')
    if (addBlock?.type === 'text') {
      expect(addBlock.text).toContain('Successfully linked directory: [extension]')
      expect(addBlock.text).toContain('(Read-Only)')
    }

    const removeResult = await removeTool.execute({ pathOrAlias: 'extension' }, mockExec)
    expect(removeResult).toBe(true)

    const removeRendered = removeTool.output?.render?.({ pathOrAlias: 'extension' }, removeResult as ToolJsonValue)
    const removeBlock = removeRendered?.[0]
    expect(removeBlock?.type).toBe('text')
    if (removeBlock?.type === 'text') {
      expect(removeBlock.text).toContain('Successfully unlinked directory "extension".')
    }
  })
})
