// ─── Node Type Colors ────────────────────────────────────────────────────────
// These are the only place Konva shape colors are defined.

export const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  scene:    { fill: '#1a2a4a', stroke: '#4a8cff' },
  decision: { fill: '#3a2a00', stroke: '#ffb700' },
  grok:     { fill: '#2a1a3a', stroke: '#9b59b6' },
  death:    { fill: '#3a0a0a', stroke: '#e74c3c' },
  ending:   { fill: '#0a2a0a', stroke: '#27ae60' }
}

export const STATUS_COLORS = {
  done:   '#27ae60',
  inprog: '#f39c12',
  todo:   null
}

export const EDGE_COLORS = {
  normal: '#4a8cff',
  death:  '#e74c3c',
  dim:    'rgba(255,255,255,0.15)'
}

export const NODE_RADIUS = 52
export const NODE_FONT_SIZE = 13
export const NODE_FONT_FAMILY = 'system-ui, -apple-system, sans-serif'
export const EDGE_LABEL_FONT_SIZE = 11

export const CANVAS_BG = '#0d0d14'
export const LINK_HANDLE_COLOR = '#ffb700'

export const DIM_OPACITY = 0.18
export const FULL_OPACITY = 1.0
