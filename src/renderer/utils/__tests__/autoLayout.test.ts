import { describe, it, expect } from 'vitest'
import { computeAutoLayout } from '../autoLayout'
import type { StoryNode, Edge } from '../../types/project'

function makeNode(id: string, x = 0, y = 0): StoryNode {
  return {
    id, title: id, type: 'scene', status: 'todo', day: null, block: null,
    path: '', x, y, summary: '', trigger: '', chars: [], branches: [],
    dialogue: '', grokHandoff: '', consequences: '', background: null,
    music: null, sfx: null, transition: 'fade', dialogueLines: [], variables: []
  }
}

function makeEdge(from: string, to: string): Edge {
  return { id: `${from}-${to}`, from, to, label: '', desc: '', isDeath: false }
}

describe('computeAutoLayout', () => {
  it('returns empty array for empty graph', () => {
    expect(computeAutoLayout([], [])).toEqual([])
  })

  it('places a single isolated node', () => {
    const result = computeAutoLayout([makeNode('A1')], [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('A1')
  })

  it('places root node at depth 0', () => {
    const nodes = [makeNode('A1'), makeNode('A2')]
    const edges = [makeEdge('A1', 'A2')]
    const result = computeAutoLayout(nodes, edges)
    const root = result.find(r => r.id === 'A1')!
    const child = result.find(r => r.id === 'A2')!
    expect(root.y).toBe(0)
    expect(child.y).toBe(240) // V_SPACING = 240
  })

  it('places nodes at consistent vertical spacing', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')]
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')]
    const result = computeAutoLayout(nodes, edges)
    const rA = result.find(r => r.id === 'A')!
    const rB = result.find(r => r.id === 'B')!
    const rC = result.find(r => r.id === 'C')!
    expect(rB.y - rA.y).toBe(240)
    expect(rC.y - rB.y).toBe(240)
  })

  it('returns a result for every input node', () => {
    const nodes = ['A', 'B', 'C', 'D'].map(id => makeNode(id))
    const edges = [makeEdge('A', 'B'), makeEdge('A', 'C'), makeEdge('B', 'D')]
    const result = computeAutoLayout(nodes, edges)
    expect(result).toHaveLength(4)
    const ids = result.map(r => r.id).sort()
    expect(ids).toEqual(['A', 'B', 'C', 'D'])
  })

  it('centers levels horizontally around 0', () => {
    // Two nodes at same depth: centers around 0
    const nodes = [makeNode('root'), makeNode('L'), makeNode('R')]
    const edges = [makeEdge('root', 'L'), makeEdge('root', 'R')]
    const result = computeAutoLayout(nodes, edges)
    const rL = result.find(r => r.id === 'L')!
    const rR = result.find(r => r.id === 'R')!
    expect(rL.x + rR.x).toBeCloseTo(0) // symmetric around 0
    expect(rR.x - rL.x).toBe(280) // H_SPACING = 280
  })

  it('isolated nodes placed below connected nodes', () => {
    const nodes = [makeNode('connected_a'), makeNode('connected_b'), makeNode('isolated')]
    const edges = [makeEdge('connected_a', 'connected_b')]
    const result = computeAutoLayout(nodes, edges)
    const maxConnectedY = Math.max(
      result.find(r => r.id === 'connected_a')!.y,
      result.find(r => r.id === 'connected_b')!.y
    )
    const isolatedY = result.find(r => r.id === 'isolated')!.y
    expect(isolatedY).toBeGreaterThan(maxConnectedY)
  })

  it('handles cycles gracefully (no infinite loop)', () => {
    const nodes = [makeNode('A'), makeNode('B')]
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'A')]
    expect(() => computeAutoLayout(nodes, edges)).not.toThrow()
    const result = computeAutoLayout(nodes, edges)
    expect(result).toHaveLength(2)
  })
})
