// ─── Bezier Math for Edge Rendering ─────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

/**
 * Given two node centers, compute control point for a quadratic bezier edge.
 * Curves away from straight lines for visual clarity.
 */
export function edgeControlPoint(from: Point, to: Point): Point {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  // Perpendicular offset — scales with distance, clamped to 60px
  const offset = Math.min(len * 0.15, 60)
  return {
    x: mx - (dy / len) * offset,
    y: my + (dx / len) * offset
  }
}

/**
 * Point on a quadratic bezier at parameter t ∈ [0,1].
 */
export function quadraticPoint(p0: Point, cp: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y
  }
}

/**
 * Tangent vector on a quadratic bezier at parameter t.
 * Used to orient arrowheads.
 */
export function quadraticTangent(p0: Point, cp: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: 2 * mt * (cp.x - p0.x) + 2 * t * (p1.x - cp.x),
    y: 2 * mt * (cp.y - p0.y) + 2 * t * (p1.y - cp.y)
  }
}

/** Midpoint of the bezier curve (t = 0.5). */
export function edgeMidpoint(p0: Point, cp: Point, p1: Point): Point {
  return quadraticPoint(p0, cp, p1, 0.5)
}

/**
 * Where a line from `from` toward `to` intersects the circle of radius `r` centered at `from`.
 */
export function circleEdgePoint(from: Point, to: Point, r: number): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return {
    x: from.x + (dx / len) * r,
    y: from.y + (dy / len) * r
  }
}
