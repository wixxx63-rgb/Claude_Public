import { describe, it, expect } from 'vitest'
import { uid, deriveChildId, spreadPositions } from '../ids'

describe('uid', () => {
  it('returns a non-empty string', () => {
    expect(uid().length).toBeGreaterThan(0)
  })

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()))
    expect(ids.size).toBe(100)
  })
})

describe('deriveChildId', () => {
  it('increments numeric suffix', () => {
    expect(deriveChildId('A1', new Set())).toBe('A2')
    expect(deriveChildId('N3', new Set())).toBe('N4')
  })

  it('skips existing IDs', () => {
    expect(deriveChildId('A1', new Set(['A2']))).toBe('A3')
    expect(deriveChildId('A1', new Set(['A2', 'A3']))).toBe('A4')
  })

  it('handles IDs without numeric suffix', () => {
    const id = deriveChildId('INTRO', new Set())
    expect(id).toBe('INTRO-2')
  })

  it('skips existing non-numeric suffixes', () => {
    const id = deriveChildId('INTRO', new Set(['INTRO-2']))
    expect(id).toBe('INTRO-3')
  })

  it('handles multi-digit numbers', () => {
    expect(deriveChildId('SC10', new Set())).toBe('SC11')
  })
})

describe('spreadPositions', () => {
  it('returns correct count', () => {
    expect(spreadPositions(0, 0, 3)).toHaveLength(3)
    expect(spreadPositions(0, 0, 1)).toHaveLength(1)
  })

  it('single child is directly below parent', () => {
    const [pos] = spreadPositions(100, 200, 1)
    expect(pos.x).toBe(100)
    expect(pos.y).toBe(420) // 200 + 220
  })

  it('two children are symmetric around parent', () => {
    const [left, right] = spreadPositions(0, 0, 2, 240, 220)
    expect(left.x + right.x).toBeCloseTo(0) // symmetric
    expect(left.y).toBe(right.y)
  })

  it('uses correct vertical offset', () => {
    const positions = spreadPositions(0, 100, 3, 280, 220)
    for (const p of positions) {
      expect(p.y).toBe(320) // 100 + 220
    }
  })
})
