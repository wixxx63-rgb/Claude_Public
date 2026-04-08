import type { Variable, VariableEffect } from '../types/project'

export type VarState = Record<string, unknown>

/** Build initial variable state from Variable definitions. */
export function buildDefaultState(variables: Variable[]): VarState {
  const state: VarState = {}
  for (const v of variables) {
    state[v.id] = v.defaultValue
  }
  return state
}

/** Apply a list of VariableEffects to a state (returns new state). */
export function applyEffects(state: VarState, effects: VariableEffect[]): VarState {
  const next = { ...state }
  for (const e of effects) {
    const cur = next[e.variableId]
    switch (e.operation) {
      case 'set':
        next[e.variableId] = e.value
        break
      case 'add':
        next[e.variableId] = (typeof cur === 'number' ? cur : 0) + (e.value as number)
        break
      case 'subtract':
        next[e.variableId] = (typeof cur === 'number' ? cur : 0) - (e.value as number)
        break
      case 'toggle':
        next[e.variableId] = !cur
        break
    }
  }
  return next
}

/**
 * Evaluate a condition string against current variable state.
 * Supported syntax:
 *   varName=value     equality
 *   varName!=value    inequality
 *   varName>number    numeric greater-than
 *   varName<number    numeric less-than
 *   varName>=number   numeric ≥
 *   varName<=number   numeric ≤
 *   varName           truthy check
 *   !varName          falsy check
 */
export function evalCondition(condition: string | null, state: VarState): boolean {
  if (!condition || condition.trim() === '') return true

  const c = condition.trim()

  // Negation: !varName
  if (c.startsWith('!') && !c.includes('=') && !c.includes('>') && !c.includes('<')) {
    return !state[c.slice(1)]
  }

  // Operators: >=, <=, !=, >, <, =
  const opMatch = c.match(/^([^><=!]+)(>=|<=|!=|>|<|=)(.+)$/)
  if (opMatch) {
    const [, name, op, rawVal] = opMatch
    const varName = name.trim()
    const rawValue = rawVal.trim()
    const cur = state[varName]

    const numVal = parseFloat(rawValue)
    const curNum = typeof cur === 'number' ? cur : parseFloat(String(cur))

    switch (op) {
      case '=':
        return String(cur) === rawValue || cur === coerce(rawValue)
      case '!=':
        return String(cur) !== rawValue && cur !== coerce(rawValue)
      case '>':
        return !isNaN(curNum) && !isNaN(numVal) && curNum > numVal
      case '<':
        return !isNaN(curNum) && !isNaN(numVal) && curNum < numVal
      case '>=':
        return !isNaN(curNum) && !isNaN(numVal) && curNum >= numVal
      case '<=':
        return !isNaN(curNum) && !isNaN(numVal) && curNum <= numVal
    }
  }

  // Plain truthy: varName
  return !!state[c]
}

/** Parse branch effect strings like "loyalty=high", "knows_secret=true", "day+1" */
export function parseBranchEffects(effects: string[], variables: Variable[]): VariableEffect[] {
  const varByName = new Map(variables.map(v => [v.name, v]))
  const result: VariableEffect[] = []

  for (const effect of effects) {
    const trimmed = effect.trim()
    if (!trimmed) continue

    const setMatch = trimmed.match(/^(\w+)=(.+)$/)
    if (setMatch) {
      const v = varByName.get(setMatch[1])
      if (v) result.push({ variableId: v.id, operation: 'set', value: coerce(setMatch[2]) })
      continue
    }

    const addMatch = trimmed.match(/^(\w+)\+(\d+)$/)
    if (addMatch) {
      const v = varByName.get(addMatch[1])
      if (v) result.push({ variableId: v.id, operation: 'add', value: parseInt(addMatch[2], 10) })
      continue
    }

    const subMatch = trimmed.match(/^(\w+)-(\d+)$/)
    if (subMatch) {
      const v = varByName.get(subMatch[1])
      if (v) result.push({ variableId: v.id, operation: 'subtract', value: parseInt(subMatch[2], 10) })
    }
  }

  return result
}

function coerce(val: string): unknown {
  if (val === 'true') return true
  if (val === 'false') return false
  const n = Number(val)
  if (!isNaN(n) && val !== '') return n
  return val
}
