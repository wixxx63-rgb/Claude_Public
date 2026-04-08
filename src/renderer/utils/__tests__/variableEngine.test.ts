import { describe, it, expect } from 'vitest'
import {
  buildDefaultState,
  applyEffects,
  evalCondition,
  parseBranchEffects
} from '../variableEngine'
import type { Variable, VariableEffect } from '../../types/project'

const vars: Variable[] = [
  { id: 'v1', name: 'loyalty', type: 'number', defaultValue: 0 },
  { id: 'v2', name: 'knows_secret', type: 'boolean', defaultValue: false },
  { id: 'v3', name: 'path', type: 'string', defaultValue: '' }
]

describe('buildDefaultState', () => {
  it('creates initial state from variables', () => {
    const state = buildDefaultState(vars)
    expect(state).toEqual({ v1: 0, v2: false, v3: '' })
  })
})

describe('applyEffects', () => {
  it('set operation', () => {
    const state = { v1: 0 }
    const effects: VariableEffect[] = [{ variableId: 'v1', operation: 'set', value: 5 }]
    expect(applyEffects(state, effects)).toEqual({ v1: 5 })
  })

  it('add operation', () => {
    const state = { v1: 3 }
    const effects: VariableEffect[] = [{ variableId: 'v1', operation: 'add', value: 2 }]
    expect(applyEffects(state, effects)).toEqual({ v1: 5 })
  })

  it('subtract operation', () => {
    const state = { v1: 10 }
    const effects: VariableEffect[] = [{ variableId: 'v1', operation: 'subtract', value: 4 }]
    expect(applyEffects(state, effects)).toEqual({ v1: 6 })
  })

  it('toggle operation', () => {
    const state = { v2: false }
    const effects: VariableEffect[] = [{ variableId: 'v2', operation: 'toggle', value: null }]
    expect(applyEffects(state, effects)).toEqual({ v2: true })
  })

  it('does not mutate original state', () => {
    const state = { v1: 0 }
    const effects: VariableEffect[] = [{ variableId: 'v1', operation: 'set', value: 99 }]
    applyEffects(state, effects)
    expect(state.v1).toBe(0)
  })
})

describe('evalCondition', () => {
  const state = { v1: 5, v2: true, v3: 'high', missing: undefined }

  it('null/empty condition is always true', () => {
    expect(evalCondition(null, state)).toBe(true)
    expect(evalCondition('', state)).toBe(true)
    expect(evalCondition('  ', state)).toBe(true)
  })

  it('truthy check', () => {
    expect(evalCondition('v2', state)).toBe(true)
    expect(evalCondition('missing', state)).toBe(false)
  })

  it('negation', () => {
    expect(evalCondition('!missing', state)).toBe(true)
    expect(evalCondition('!v2', state)).toBe(false)
  })

  it('equality =', () => {
    expect(evalCondition('v3=high', state)).toBe(true)
    expect(evalCondition('v3=low', state)).toBe(false)
    expect(evalCondition('v1=5', state)).toBe(true)
    expect(evalCondition('v2=true', state)).toBe(true)
  })

  it('inequality !=', () => {
    expect(evalCondition('v3!=low', state)).toBe(true)
    expect(evalCondition('v3!=high', state)).toBe(false)
  })

  it('numeric comparisons', () => {
    expect(evalCondition('v1>3', state)).toBe(true)
    expect(evalCondition('v1>5', state)).toBe(false)
    expect(evalCondition('v1>=5', state)).toBe(true)
    expect(evalCondition('v1<10', state)).toBe(true)
    expect(evalCondition('v1<=5', state)).toBe(true)
    expect(evalCondition('v1<=4', state)).toBe(false)
  })
})

describe('parseBranchEffects', () => {
  it('parses set effects', () => {
    const result = parseBranchEffects(['loyalty=high', 'knows_secret=true'], vars)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ variableId: 'v1', operation: 'set', value: 'high' })
    expect(result[1]).toEqual({ variableId: 'v2', operation: 'set', value: true })
  })

  it('parses add effects', () => {
    const result = parseBranchEffects(['loyalty+3'], vars)
    expect(result).toEqual([{ variableId: 'v1', operation: 'add', value: 3 }])
  })

  it('parses subtract effects', () => {
    const result = parseBranchEffects(['loyalty-2'], vars)
    expect(result).toEqual([{ variableId: 'v1', operation: 'subtract', value: 2 }])
  })

  it('ignores unknown variables', () => {
    const result = parseBranchEffects(['unknown=5'], vars)
    expect(result).toHaveLength(0)
  })

  it('ignores empty effects', () => {
    const result = parseBranchEffects(['', '  '], vars)
    expect(result).toHaveLength(0)
  })
})
