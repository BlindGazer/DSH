import { describe, expect, test } from 'vitest'
import { accessibleButtonLabel } from './AccessibleButton'

describe('accessibleButtonLabel', () => {
  test.each([
    ['  Save  ', 'Save'],
    ['\tSave\n', 'Save'],
    ['Save changes', 'Save changes'],
    ['', ''],
    [' \t\n ', ''],
  ])('normalizes %j to %j', (label, expected) => {
    expect(accessibleButtonLabel({ label })).toEqual(expected)
  })

  test('does not modify the input props', () => {
    const props = { label: '  Save  ', disabled: true }

    const result = accessibleButtonLabel(props)

    expect(result).toEqual('Save')
    expect(props).toStrictEqual({ label: '  Save  ', disabled: true })
  })
})
