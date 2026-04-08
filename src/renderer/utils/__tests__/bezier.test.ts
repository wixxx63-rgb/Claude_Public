import { describe, it, expect } from 'vitest'
import {
  edgeControlPoint,
  quadraticPoint,
  quadraticTangent,
  edgeMidpoint,
  circleEdgePoint
} from '../bezier'
import type { Point } from '../bezier'

describe('circleEdgePoint', () => {
  it('returns a point at radius distance from origin', () => {
    const from: Point = { x: 0, y: 0 }
    const to: Point = { x: 100, y: 0 }
    const result = circleEdgePoint(from, to, 52)
    expect(result.x).toBeCloseTo(52)
    expect(result.y).toBeCloseTo(0)
  })

  it('handles vertical direction', () => {
    const from: Point = { x: 0, y: 0 }
    const to: Point = { x: 0, y: 100 }
    const result = circleEdgePoint(from, to, 52)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(52)
  })

  it('handles diagonal direction', () => {
    const from: Point = { x: 0, y: 0 }
    const to: Point = { x: 100, y: 100 }
    const result = circleEdgePoint(from, to, 52)
    const dist = Math.sqrt(result.x ** 2 + result.y ** 2)
    expect(dist).toBeCloseTo(52)
  })
})

describe('quadraticPoint', () => {
  it('returns start point at t=0', () => {
    const p0: Point = { x: 0, y: 0 }
    const cp: Point = { x: 50, y: 100 }
    const p1: Point = { x: 100, y: 0 }
    const result = quadraticPoint(p0, cp, p1, 0)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(0)
  })

  it('returns end point at t=1', () => {
    const p0: Point = { x: 0, y: 0 }
    const cp: Point = { x: 50, y: 100 }
    const p1: Point = { x: 100, y: 0 }
    const result = quadraticPoint(p0, cp, p1, 1)
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(0)
  })

  it('returns midpoint at t=0.5', () => {
    const p0: Point = { x: 0, y: 0 }
    const cp: Point = { x: 50, y: 0 }
    const p1: Point = { x: 100, y: 0 }
    // Straight line with cp on the line: midpoint should be 50,0
    const result = quadraticPoint(p0, cp, p1, 0.5)
    expect(result.x).toBeCloseTo(50)
    expect(result.y).toBeCloseTo(0)
  })
})

describe('edgeMidpoint', () => {
  it('equals quadraticPoint at t=0.5', () => {
    const p0: Point = { x: 10, y: 20 }
    const cp: Point = { x: 80, y: 120 }
    const p1: Point = { x: 200, y: 50 }
    const mid = edgeMidpoint(p0, cp, p1)
    const expected = quadraticPoint(p0, cp, p1, 0.5)
    expect(mid.x).toBeCloseTo(expected.x)
    expect(mid.y).toBeCloseTo(expected.y)
  })
})

describe('quadraticTangent', () => {
  it('returns non-zero vector for non-degenerate curve', () => {
    const p0: Point = { x: 0, y: 0 }
    const cp: Point = { x: 50, y: 100 }
    const p1: Point = { x: 100, y: 0 }
    const tangent = quadraticTangent(p0, cp, p1, 0.99)
    const len = Math.sqrt(tangent.x ** 2 + tangent.y ** 2)
    expect(len).toBeGreaterThan(0)
  })
})

describe('edgeControlPoint', () => {
  it('returns a point between two nodes', () => {
    const from: Point = { x: 0, y: 0 }
    const to: Point = { x: 280, y: 240 }
    const cp = edgeControlPoint(from, to)
    // Control point should be somewhere near the midpoint
    expect(cp.x).toBeGreaterThan(-100)
    expect(cp.x).toBeGreaterThan(-100)
  })

  it('produces different control points for different directions', () => {
    const from: Point = { x: 0, y: 0 }
    const to1: Point = { x: 100, y: 0 }
    const to2: Point = { x: 0, y: 100 }
    const cp1 = edgeControlPoint(from, to1)
    const cp2 = edgeControlPoint(from, to2)
    // They should not be the same
    expect(cp1.x !== cp2.x || cp1.y !== cp2.y).toBe(true)
  })
})
