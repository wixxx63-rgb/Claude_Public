import type { StoryNode, Edge } from '../types/project'

export interface LayoutResult {
  id: string
  x: number
  y: number
}

const H_SPACING = 280
const V_SPACING = 240
const ISOLATED_Y_OFFSET = 400

/**
 * BFS auto-layout algorithm.
 * - Find root nodes (no incoming edges); if none, use node with most outgoing edges.
 * - Assign each node its maximum BFS depth.
 * - Within each depth level, sort by ID.
 * - Center each level around x=0.
 * - Isolated nodes (no edges) placed in a row below.
 */
export function computeAutoLayout(nodes: StoryNode[], edges: Edge[]): LayoutResult[] {
  if (nodes.length === 0) return []

  const nodeIds = new Set(nodes.map(n => n.id))
  const incomingCount = new Map<string, number>()
  const outgoing = new Map<string, string[]>()

  for (const node of nodes) {
    incomingCount.set(node.id, 0)
    outgoing.set(node.id, [])
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1)
      outgoing.get(edge.from)!.push(edge.to)
    }
  }

  // Connected nodes (have at least one edge)
  const connected = new Set<string>()
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      connected.add(edge.from)
      connected.add(edge.to)
    }
  }
  const isolated = nodes.filter(n => !connected.has(n.id))
  const graphNodes = nodes.filter(n => connected.has(n.id))

  // Find roots
  let roots = graphNodes.filter(n => incomingCount.get(n.id) === 0)
  if (roots.length === 0 && graphNodes.length > 0) {
    // Pick node with most outgoing edges
    const best = graphNodes.reduce((a, b) =>
      (outgoing.get(b.id)?.length ?? 0) > (outgoing.get(a.id)?.length ?? 0) ? b : a
    )
    roots = [best]
  }

  // BFS to assign max depth
  const depth = new Map<string, number>()
  const queue: Array<{ id: string; d: number }> = roots.map(r => ({ id: r.id, d: 0 }))

  while (queue.length > 0) {
    const { id, d } = queue.shift()!
    const existing = depth.get(id)
    if (existing !== undefined && existing >= d) continue
    depth.set(id, d)
    for (const child of outgoing.get(id) ?? []) {
      queue.push({ id: child, d: d + 1 })
    }
  }

  // Nodes unreachable from BFS roots (cycles etc.) get placed at depth 0
  for (const n of graphNodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0)
  }

  // Group by depth
  const levels = new Map<number, string[]>()
  for (const [id, d] of depth) {
    if (!levels.has(d)) levels.set(d, [])
    levels.get(d)!.push(id)
  }

  // Sort each level by ID
  for (const arr of levels.values()) {
    arr.sort()
  }

  // Assign positions
  const results: LayoutResult[] = []
  const maxDepth = Math.max(...levels.keys(), 0)

  for (let d = 0; d <= maxDepth; d++) {
    const ids = levels.get(d) ?? []
    const totalWidth = (ids.length - 1) * H_SPACING
    ids.forEach((id, i) => {
      results.push({
        id,
        x: -totalWidth / 2 + i * H_SPACING,
        y: d * V_SPACING
      })
    })
  }

  // Place isolated nodes in a row below all graph nodes
  const isolatedY = (maxDepth + 1) * V_SPACING + ISOLATED_Y_OFFSET
  const isolatedTotal = (isolated.length - 1) * H_SPACING
  isolated.forEach((node, i) => {
    results.push({
      id: node.id,
      x: -isolatedTotal / 2 + i * H_SPACING,
      y: isolatedY
    })
  })

  return results
}
