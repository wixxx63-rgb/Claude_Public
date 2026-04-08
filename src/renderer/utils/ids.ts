let counter = 0

export function uid(): string {
  return `${Date.now().toString(36)}-${(++counter).toString(36)}`
}

/** Derive a child node ID from a parent. e.g. "A1" → "A2", "PATH-C-2" → "PATH-C-3" */
export function deriveChildId(parentId: string, existingIds: Set<string>): string {
  const match = parentId.match(/^(.*?)(\d+)$/)
  if (match) {
    const prefix = match[1]
    let n = parseInt(match[2], 10) + 1
    while (existingIds.has(`${prefix}${n}`)) n++
    return `${prefix}${n}`
  }
  let suffix = 2
  while (existingIds.has(`${parentId}-${suffix}`)) suffix++
  return `${parentId}-${suffix}`
}

/** Spread N child nodes evenly below a parent position. */
export function spreadPositions(
  parentX: number,
  parentY: number,
  count: number,
  spacingX = 240,
  spacingY = 220
): Array<{ x: number; y: number }> {
  const totalWidth = (count - 1) * spacingX
  return Array.from({ length: count }, (_, i) => ({
    x: parentX - totalWidth / 2 + i * spacingX,
    y: parentY + spacingY
  }))
}
