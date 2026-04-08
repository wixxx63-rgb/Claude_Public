import React, { useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { NODE_COLORS, CANVAS_BG } from '../../utils/theme'

const MAP_W = 200
const MAP_H = 130
const PADDING = 8
const NODE_DOT_R = 5

export interface MinimapProps {
  onViewportJump: (worldX: number, worldY: number) => void
}

const Minimap: React.FC<MinimapProps> = ({ onViewportJump }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodes = useProjectStore((s) => s.project.nodes)
  const edges = useProjectStore((s) => s.project.edges)
  const zoom = useUIStore((s) => s.zoom)
  const stageX = useUIStore((s) => s.stageX)
  const stageY = useUIStore((s) => s.stageY)

  // Compute bounding box of all nodes
  const getBounds = useCallback(() => {
    if (nodes.length === 0) return { minX: -200, minY: -200, maxX: 200, maxY: 200 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x - 52)
      minY = Math.min(minY, n.y - 52)
      maxX = Math.max(maxX, n.x + 52)
      maxY = Math.max(maxY, n.y + 52)
    }
    return { minX, minY, maxX, maxY }
  }, [nodes])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, MAP_W, MAP_H)

    // Background
    ctx.fillStyle = 'rgba(13,13,20,0.92)'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    const bounds = getBounds()
    const worldW = bounds.maxX - bounds.minX || 1
    const worldH = bounds.maxY - bounds.minY || 1

    const availW = MAP_W - PADDING * 2
    const availH = MAP_H - PADDING * 2
    const scale = Math.min(availW / worldW, availH / worldH)

    const offsetX = PADDING + (availW - worldW * scale) / 2
    const offsetY = PADDING + (availH - worldH * scale) / 2

    // World → minimap transform
    const toMap = (wx: number, wy: number) => ({
      x: offsetX + (wx - bounds.minX) * scale,
      y: offsetY + (wy - bounds.minY) * scale,
    })

    // Draw edges
    ctx.lineWidth = 0.8
    ctx.strokeStyle = 'rgba(74,140,255,0.4)'
    for (const edge of edges) {
      const fn = nodes.find((n) => n.id === edge.from)
      const tn = nodes.find((n) => n.id === edge.to)
      if (!fn || !tn) continue
      const fp = toMap(fn.x, fn.y)
      const tp = toMap(tn.x, tn.y)
      ctx.beginPath()
      ctx.moveTo(fp.x, fp.y)
      ctx.lineTo(tp.x, tp.y)
      ctx.stroke()
    }

    // Draw nodes
    for (const node of nodes) {
      const colors = NODE_COLORS[node.type] ?? NODE_COLORS.scene
      const pt = toMap(node.x, node.y)
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, NODE_DOT_R, 0, Math.PI * 2)
      ctx.fillStyle = colors.stroke
      ctx.fill()
    }

    // Viewport rectangle
    // The stage viewport in world coords:
    // The canvas is (window.innerWidth) × (window.innerHeight - 48) for the viewport
    const vpW = (window.innerWidth / zoom)
    const vpH = ((window.innerHeight - 48) / zoom)
    const vpWorldX = -stageX / zoom
    const vpWorldY = -stageY / zoom

    const vpMapTL = toMap(vpWorldX, vpWorldY)
    const vpMapW = vpW * scale
    const vpMapH = vpH * scale

    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(vpMapTL.x, vpMapTL.y, vpMapW, vpMapH)
  }, [nodes, edges, zoom, stageX, stageY, getBounds])

  // Redraw whenever relevant state changes
  useEffect(() => {
    const raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [draw])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      const bounds = getBounds()
      const worldW = bounds.maxX - bounds.minX || 1
      const worldH = bounds.maxY - bounds.minY || 1
      const availW = MAP_W - PADDING * 2
      const availH = MAP_H - PADDING * 2
      const scale = Math.min(availW / worldW, availH / worldH)
      const offsetX = PADDING + (availW - worldW * scale) / 2
      const offsetY = PADDING + (availH - worldH * scale) / 2

      const worldX = (cx - offsetX) / scale + bounds.minX
      const worldY = (cy - offsetY) / scale + bounds.minY
      onViewportJump(worldX, worldY)
    },
    [getBounds, onViewportJump]
  )

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: MAP_W,
        height: MAP_H,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #333',
        boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        pointerEvents: 'all',
        zIndex: 10,
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        style={{ display: 'block', cursor: 'crosshair' }}
        onClick={handleClick}
      />
    </div>
  )
}

export default Minimap
