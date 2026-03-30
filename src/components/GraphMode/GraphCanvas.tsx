import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useStore } from '../../store'
import type { StoryNode, Edge, CanvasTransform } from '../../types'
import { computeAutoLayout } from '../../utils/autoLayout'
import { v4 as uuidv4 } from 'uuid'
import Minimap from './Minimap'
import EdgePopover from './EdgePopover'
import { traceForward, traceBackward, traceEdges } from '../../utils/pathTracer'

const NODE_RADIUS = 52
const COLORS = {
  scene:    { fill: '#0a2044', stroke: '#4a80d4' },
  decision: { fill: '#302000', stroke: '#d4a040' },
  grok:     { fill: '#200840', stroke: '#9060d0' },
  death:    { fill: '#2a0808', stroke: '#d04040' },
  ending:   { fill: '#082814', stroke: '#40a060' }
}

interface DragState {
  nodeId: string
  startX: number
  startY: number
  startMouseX: number
  startMouseY: number
  moved: boolean
}

interface LinkDragState {
  fromId: string
  startX: number
  startY: number
  curX: number
  curY: number
}

interface PopoverState {
  x: number
  y: number
  fromId: string
  toId: string
}

export default function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const linkDragRafRef = useRef<number>(0)
  const transformRef = useRef<CanvasTransform>({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<DragState | null>(null)
  const linkDragRef = useRef<LinkDragState | null>(null)
  const panRef = useRef<{ startX: number; startY: number; origTX: number; origTY: number } | null>(null)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const autoAnimRef = useRef<{ targets: { id: string; x: number; y: number }[]; start: number } | null>(null)
  // Always points to the latest draw() function so event handlers can call it
  const drawFnRef = useRef<() => void>(() => {})

  const { project, selectedNodeId, canvasTransform, linkModeActive, searchQuery } = useStore(s => ({
    project: s.project,
    selectedNodeId: s.selectedNodeId,
    canvasTransform: s.canvasTransform,
    linkModeActive: s.linkModeActive,
    searchQuery: s.searchQuery
  }))
  const setCanvasTransform = useStore(s => s.setCanvasTransform)
  const navigateTo = useStore(s => s.navigateTo)
  const setSelectedNode = useStore(s => s.setSelectedNode)
  const moveNode = useStore(s => s.moveNode)
  const snapshotForUndo = useStore(s => s.snapshotForUndo)
  const addEdge = useStore(s => s.addEdge)
  const createNodeAt = useStore(s => s.createNodeAt)
  const setMode = useStore(s => s.setMode)

  // Path tracer state (local — not needed in store for this use)
  const [pathTracerNodeId, setPathTracerNodeId] = useState<string | null>(null)
  const [pathTracerToast, setPathTracerToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep transform ref in sync
  useEffect(() => {
    transformRef.current = canvasTransform
  }, [canvasTransform])

  // Canvas resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Redraw whenever relevant state changes
  useEffect(() => {
    draw()
  })

  function worldToScreen(wx: number, wy: number, t: CanvasTransform): [number, number] {
    return [wx * t.scale + t.x, wy * t.scale + t.y]
  }

  function screenToWorld(sx: number, sy: number, t: CanvasTransform): [number, number] {
    return [(sx - t.x) / t.scale, (sy - t.y) / t.scale]
  }

  function getNodeAtScreen(sx: number, sy: number): StoryNode | null {
    const t = transformRef.current
    const [wx, wy] = screenToWorld(sx, sy, t)
    // Reverse iterate to hit topmost
    for (let i = project.nodes.length - 1; i >= 0; i--) {
      const n = project.nodes[i]
      const dx = wx - n.x, dy = wy - n.y
      if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS) return n
    }
    return null
  }

  function getLinkHandleAtScreen(sx: number, sy: number): StoryNode | null {
    if (!linkModeActive) return null
    const t = transformRef.current
    for (const n of project.nodes) {
      const [hx, hy] = worldToScreen(n.x + NODE_RADIUS, n.y, t)
      const dx = sx - hx, dy = sy - hy
      if (Math.sqrt(dx * dx + dy * dy) <= 10) return n
    }
    return null
  }

  // ── Drawing ────────────────────────────────────────────────────────────

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const t = transformRef.current
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, W, H)

    // Grid dots
    drawGrid(ctx, W, H, t)

    // Determine dim/highlight state
    const dimmed = new Set<string>()
    if (selectedNodeId && !pathTracerNodeId) {
      const outgoing = project.edges.filter(e => e.from === selectedNodeId).map(e => e.to)
      const connected = new Set([selectedNodeId, ...outgoing])
      project.nodes.forEach(n => { if (!connected.has(n.id)) dimmed.add(n.id) })
    }

    // Search highlight
    const searchMatches = new Set<string>()
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      project.nodes.forEach(n => {
        if (n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q) ||
            n.summary.toLowerCase().includes(q)) {
          searchMatches.add(n.id)
        }
      })
    }

    // Path tracer highlight
    let tracedNodes = new Set<string>()
    let tracedEdges = new Set<string>()
    if (pathTracerNodeId) {
      const tracerNode = project.nodes.find(n => n.id === pathTracerNodeId)
      if (tracerNode) {
        const isEnd = tracerNode.type === 'ending' || tracerNode.type === 'death'
        tracedNodes = isEnd
          ? traceBackward(pathTracerNodeId, project.nodes, project.edges)
          : traceForward(pathTracerNodeId, project.nodes, project.edges)
        tracedEdges = traceEdges(tracedNodes, project.edges)
      }
    }

    // Draw edges
    ctx.save()
    project.edges.forEach(edge => {
      const fromNode = project.nodes.find(n => n.id === edge.from)
      const toNode = project.nodes.find(n => n.id === edge.to)
      if (!fromNode || !toNode) return
      const isDim = pathTracerNodeId
        ? !tracedEdges.has(edge.id)
        : selectedNodeId
        ? dimmed.has(edge.from) || dimmed.has(edge.to)
        : false
      const isTraced = tracedEdges.has(edge.id)
      drawEdge(ctx, fromNode, toNode, edge, t, isDim, t.scale > 0.35, isTraced)
    })

    // Link drag line
    if (linkDragRef.current) {
      const ld = linkDragRef.current
      const [sx, sy] = worldToScreen(ld.startX, ld.startY, t)
      ctx.save()
      ctx.strokeStyle = '#d4a040'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ld.curX, ld.curY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // Draw nodes
    project.nodes.forEach(node => {
      const isSelected = node.id === selectedNodeId
      const isDim = pathTracerNodeId
        ? !tracedNodes.has(node.id)
        : dimmed.has(node.id)
      const isSearchDim = searchQuery ? !searchMatches.has(node.id) : false
      const isTraced = tracedNodes.has(node.id)
      const isTracerSource = node.id === pathTracerNodeId
      const alpha = isDim || isSearchDim ? 0.15 : 1
      drawNode(ctx, node, t, isSelected, alpha, linkModeActive, isTraced, isTracerSource)
    })
    ctx.restore()
  }

  function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number, t: CanvasTransform) {
    const spacing = 40 * t.scale
    if (spacing < 8) return
    const offsetX = ((t.x % spacing) + spacing) % spacing
    const offsetY = ((t.y % spacing) + spacing) % spacing
    ctx.fillStyle = '#1e2435'
    for (let x = offsetX; x < W; x += spacing) {
      for (let y = offsetY; y < H; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  function drawEdge(
    ctx: CanvasRenderingContext2D,
    from: StoryNode, to: StoryNode,
    edge: Edge, t: CanvasTransform,
    dimmed: boolean, showLabel: boolean,
    isTraced = false
  ) {
    const [fx, fy] = worldToScreen(from.x, from.y, t)
    const [tx, ty] = worldToScreen(to.x, to.y, t)

    // Offset from node centers to borders
    const dx = tx - fx, dy = ty - fy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return
    const r = NODE_RADIUS * t.scale
    const startX = fx + (dx / len) * r
    const startY = fy + (dy / len) * r
    const endX = tx - (dx / len) * (r + 8)
    const endY = ty - (dy / len) * (r + 8)

    // Bezier control points
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const perpX = -(dy / len) * 40 * t.scale
    const perpY = (dx / len) * 40 * t.scale
    const cpX = midX + perpX
    const cpY = midY + perpY

    ctx.save()
    ctx.globalAlpha = dimmed ? 0.1 : isTraced ? 1 : 0.7
    ctx.strokeStyle = isTraced ? '#40c0a0' : edge.isDeath ? '#d04040' : '#3a4a68'
    ctx.lineWidth = isTraced ? 2.5 : 1.5
    if (edge.isDeath) ctx.setLineDash([5, 4])

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(cpX, cpY, endX, endY)
    ctx.stroke()
    ctx.setLineDash([])

    // Arrowhead
    const angle = Math.atan2(endY - cpY, endX - cpX)
    const arrowSize = 8 * t.scale
    ctx.fillStyle = isTraced ? '#40c0a0' : edge.isDeath ? '#d04040' : '#3a4a68'
    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - 0.4),
      endY - arrowSize * Math.sin(angle - 0.4)
    )
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + 0.4),
      endY - arrowSize * Math.sin(angle + 0.4)
    )
    ctx.closePath()
    ctx.fill()

    // Label
    if (showLabel && edge.label) {
      const labelX = cpX
      const labelY = cpY - 6
      ctx.font = `${11 * t.scale}px -apple-system, sans-serif`
      ctx.fillStyle = '#9aa5bb'
      ctx.textAlign = 'center'
      ctx.fillText(edge.label, labelX, labelY)
    }

    ctx.restore()
  }

  function drawNode(
    ctx: CanvasRenderingContext2D,
    node: StoryNode, t: CanvasTransform,
    isSelected: boolean, alpha: number,
    linkMode: boolean,
    isTraced = false,
    isTracerSource = false
  ) {
    const [sx, sy] = worldToScreen(node.x, node.y, t)
    const r = NODE_RADIUS * t.scale
    const colors = COLORS[node.type]

    ctx.save()
    ctx.globalAlpha = alpha

    // Teal tracer ring (outer, drawn before fill)
    if (isTraced || isTracerSource) {
      ctx.beginPath()
      ctx.arc(sx, sy, r + 5, 0, Math.PI * 2)
      ctx.strokeStyle = isTracerSource ? '#80e0c0' : '#40c0a0'
      ctx.lineWidth = isTracerSource ? 3 : 2
      ctx.shadowColor = '#40c0a0'
      ctx.shadowBlur = 10
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Shadow for selected
    if (isSelected) {
      ctx.shadowColor = colors.stroke
      ctx.shadowBlur = 20
    }

    // Fill
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = colors.fill
    ctx.fill()

    // Stroke
    ctx.strokeStyle = isTraced ? '#40c0a0' : colors.stroke
    ctx.lineWidth = isSelected ? 3 : isTraced ? 2.5 : 2
    ctx.stroke()
    ctx.shadowBlur = 0

    // Status ring
    const ringR = r - 5
    if (node.status === 'done') {
      ctx.beginPath()
      ctx.arc(sx, sy, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = colors.stroke
      ctx.lineWidth = 2
      ctx.globalAlpha = alpha * 0.6
      ctx.stroke()
    } else if (node.status === 'inprog') {
      ctx.beginPath()
      ctx.arc(sx, sy, ringR, -Math.PI / 2, Math.PI / 2)
      ctx.strokeStyle = colors.stroke
      ctx.lineWidth = 2
      ctx.globalAlpha = alpha * 0.6
      ctx.stroke()
    }
    ctx.globalAlpha = alpha

    // Title text
    const maxWidth = r * 1.6
    ctx.font = `bold ${Math.max(10, 12 * t.scale)}px -apple-system, sans-serif`
    ctx.fillStyle = '#e8ecf4'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const truncated = truncateText(ctx, node.title, maxWidth)
    ctx.fillText(truncated, sx, sy)

    // ID below node
    if (t.scale > 0.45) {
      ctx.font = `${10 * t.scale}px -apple-system, sans-serif`
      ctx.fillStyle = '#5e6e8a'
      ctx.fillText(node.id, sx, sy + r + 10 * t.scale)
    }

    // Dot indicators
    const dotR = Math.max(4, 5 * t.scale)

    // Gold dot (branches) — top right
    if (node.branches.length > 0) {
      ctx.beginPath()
      ctx.arc(sx + r * 0.7, sy - r * 0.7, dotR, 0, Math.PI * 2)
      ctx.fillStyle = '#d4a040'
      ctx.fill()
    }

    // Purple dot (grokHandoff) — top left
    if (node.grokHandoff) {
      ctx.beginPath()
      ctx.arc(sx - r * 0.7, sy - r * 0.7, dotR, 0, Math.PI * 2)
      ctx.fillStyle = '#9060d0'
      ctx.fill()
    }

    // Image icon — bottom
    if (node.background) {
      ctx.font = `${Math.max(8, 10 * t.scale)}px -apple-system, sans-serif`
      ctx.fillStyle = '#5e6e8a'
      ctx.fillText('⬛', sx, sy + r * 0.7)
    }

    // Link handle
    if (linkMode) {
      const hx = sx + r
      const hy = sy
      ctx.beginPath()
      ctx.arc(hx, hy, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#302000'
      ctx.strokeStyle = '#d4a040'
      ctx.lineWidth = 1.5
      ctx.fill()
      ctx.stroke()
      ctx.font = `bold 10px sans-serif`
      ctx.fillStyle = '#d4a040'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('+', hx, hy)
    }

    ctx.restore()
  }

  function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text
    let truncated = text
    while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '…'
  }

  // Keep drawFnRef pointing to the latest draw() so event-handler closures can call it
  drawFnRef.current = draw

  function startLinkDragLoop() {
    cancelAnimationFrame(linkDragRafRef.current)
    function loop() {
      drawFnRef.current()
      if (linkDragRef.current) {
        linkDragRafRef.current = requestAnimationFrame(loop)
      }
    }
    linkDragRafRef.current = requestAnimationFrame(loop)
  }

  function cancelLinkDrag() {
    linkDragRef.current = null
    cancelAnimationFrame(linkDragRafRef.current)
    drawFnRef.current()
  }

  // ── Mouse Events ──────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const sx = e.nativeEvent.offsetX
    const sy = e.nativeEvent.offsetY

    // Shift+click: path tracer
    if (e.shiftKey) {
      const node = getNodeAtScreen(sx, sy)
      if (node) {
        if (pathTracerNodeId === node.id) {
          setPathTracerNodeId(null)
        } else {
          setPathTracerNodeId(node.id)
          // Show toast if no paths exist
          const isEnd = node.type === 'ending' || node.type === 'death'
          const traced = isEnd
            ? traceBackward(node.id, project.nodes, project.edges)
            : traceForward(node.id, project.nodes, project.edges)
          if (traced.size <= 1) {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            setPathTracerToast(isEnd ? 'No ancestors found' : 'No reachable nodes found')
            toastTimerRef.current = setTimeout(() => setPathTracerToast(null), 2500)
          }
        }
      } else {
        setPathTracerNodeId(null)
      }
      return
    }

    // Check link handle first
    const handleNode = getLinkHandleAtScreen(sx, sy)
    if (handleNode && linkModeActive) {
      const t = transformRef.current
      const [wx, wy] = worldToScreen(handleNode.x + NODE_RADIUS, handleNode.y, t)
      linkDragRef.current = {
        fromId: handleNode.id,
        startX: handleNode.x + NODE_RADIUS,
        startY: handleNode.y,
        curX: wx,
        curY: wy
      }
      startLinkDragLoop()
      return
    }

    const node = getNodeAtScreen(sx, sy)
    if (node) {
      snapshotForUndo('node_moved')
      dragRef.current = {
        nodeId: node.id,
        startX: node.x,
        startY: node.y,
        startMouseX: sx,
        startMouseY: sy,
        moved: false
      }
      return
    }

    // Pan
    const t = transformRef.current
    panRef.current = { startX: sx, startY: sy, origTX: t.x, origTY: t.y }
  }, [linkModeActive, project.nodes, project.edges, snapshotForUndo, pathTracerNodeId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const sx = e.nativeEvent.offsetX
    const sy = e.nativeEvent.offsetY

    if (linkDragRef.current) {
      linkDragRef.current.curX = sx
      linkDragRef.current.curY = sy
      return
    }

    if (dragRef.current) {
      const dr = dragRef.current
      const dx = sx - dr.startMouseX
      const dy = sy - dr.startMouseY
      if (!dr.moved && Math.sqrt(dx * dx + dy * dy) > 5) dr.moved = true
      if (dr.moved) {
        const t = transformRef.current
        const [wx, wy] = screenToWorld(sx, sy, t)
        const offsetX = dr.startX - screenToWorld(dr.startMouseX, dr.startMouseY, t)[0]
        const offsetY = dr.startY - screenToWorld(dr.startMouseX, dr.startMouseY, t)[1]
        moveNode(dr.nodeId, wx + offsetX, wy + offsetY)
      }
      return
    }

    if (panRef.current) {
      const pr = panRef.current
      const t = transformRef.current
      const newT = {
        ...t,
        x: pr.origTX + (sx - pr.startX),
        y: pr.origTY + (sy - pr.startY)
      }
      transformRef.current = newT
      setCanvasTransform(newT)
    }
  }, [moveNode, setCanvasTransform])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const sx = e.nativeEvent.offsetX
    const sy = e.nativeEvent.offsetY

    // Link drag release
    if (linkDragRef.current) {
      const ld = linkDragRef.current
      cancelAnimationFrame(linkDragRafRef.current)
      const targetNode = getNodeAtScreen(sx, sy)
      if (targetNode && targetNode.id !== ld.fromId) {
        // Prevent duplicate edges
        const alreadyExists = project.edges.some(
          e => e.from === ld.fromId && e.to === targetNode.id
        )
        if (alreadyExists) {
          linkDragRef.current = null
          drawFnRef.current()
          return
        }
        // Show popover for edge label
        const t = transformRef.current
        const fromNode = project.nodes.find(n => n.id === ld.fromId)
        const [fx, fy] = worldToScreen(
          (fromNode?.x ?? 0) + NODE_RADIUS / 2,
          fromNode?.y ?? 0, t
        )
        setPopover({
          x: (sx + fx) / 2,
          y: (sy + fy) / 2,
          fromId: ld.fromId,
          toId: targetNode.id
        })
      }
      linkDragRef.current = null
      drawFnRef.current()
      return
    }

    // Node drag / click
    if (dragRef.current) {
      const dr = dragRef.current
      if (!dr.moved) {
        // Click — select and open panel
        navigateTo(dr.nodeId)
      }
      dragRef.current = null
      return
    }

    // Background click — deselect (only if not dragging/panning)
    if (panRef.current) {
      const dragDist = Math.abs(sx - panRef.current.startX) + Math.abs(sy - panRef.current.startY)
      if (dragDist < 5) setSelectedNode(null)  // It was a click, not a pan
      panRef.current = null
    }
  }, [navigateTo, setSelectedNode, project.nodes, project.edges])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const sx = e.nativeEvent.offsetX
    const sy = e.nativeEvent.offsetY
    const node = getNodeAtScreen(sx, sy)
    if (node) {
      setMode('scene', node.id)
      return
    }
    const t = transformRef.current
    const [wx, wy] = screenToWorld(sx, sy, t)
    const newNode = createNodeAt(wx, wy)
    navigateTo(newNode.id)
  }, [createNodeAt, navigateTo, setMode, project.nodes])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const t = transformRef.current
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(3, t.scale * factor))
    const mx = e.nativeEvent.offsetX
    const my = e.nativeEvent.offsetY
    const newT: CanvasTransform = {
      scale: newScale,
      x: mx - (mx - t.x) * (newScale / t.scale),
      y: my - (my - t.y) * (newScale / t.scale)
    }
    transformRef.current = newT
    setCanvasTransform(newT)
  }, [setCanvasTransform])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // Right-click on node: could show "Play from here"
    // For now just prevent default
  }, [])

  // ── Edge creation from popover ────────────────────────────────────────

  const confirmEdge = useCallback((label: string) => {
    if (!popover) return
    const edge: Edge = {
      id: uuidv4(),
      from: popover.fromId,
      to: popover.toId,
      label,
      desc: '',
      isDeath: false
    }
    addEdge(edge)
    setPopover(null)
  }, [popover, addEdge])

  // ── Auto-layout ───────────────────────────────────────────────────────

  const triggerAutoLayout = useCallback(() => {
    const targets = computeAutoLayout(project.nodes, project.edges)
    snapshotForUndo('layout_changed')
    autoAnimRef.current = { targets, start: performance.now() }

    function animate() {
      const anim = autoAnimRef.current
      if (!anim) return
      const elapsed = performance.now() - anim.start
      const duration = 400
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress

      anim.targets.forEach(target => {
        const node = project.nodes.find(n => n.id === target.id)
        if (!node) return
        const nx = node.x + (target.x - node.x) * eased
        const ny = node.y + (target.y - node.y) * eased
        moveNode(target.id, nx, ny)
      })

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        anim.targets.forEach(t => moveNode(t.id, t.x, t.y))
        autoAnimRef.current = null
      }
    }
    animate()
  }, [project.nodes, project.edges, snapshotForUndo, moveNode])

  // Expose auto layout trigger via custom event
  useEffect(() => {
    const handler = () => triggerAutoLayout()
    window.addEventListener('narrative:autoLayout', handler)
    return () => window.removeEventListener('narrative:autoLayout', handler)
  }, [triggerAutoLayout])

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => { if (linkDragRef.current) cancelLinkDrag() }}
      />
      <Minimap
        nodes={project.nodes}
        canvasRef={canvasRef}
        transform={canvasTransform}
        onJump={(wx, wy) => {
          const canvas = canvasRef.current
          if (!canvas) return
          const newT: CanvasTransform = {
            ...transformRef.current,
            x: canvas.width / 2 - wx * transformRef.current.scale,
            y: canvas.height / 2 - wy * transformRef.current.scale
          }
          transformRef.current = newT
          setCanvasTransform(newT)
        }}
      />
      {popover && (
        <EdgePopover
          x={popover.x}
          y={popover.y}
          onConfirm={confirmEdge}
          onCancel={() => setPopover(null)}
        />
      )}
      {pathTracerNodeId && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2032', border: '1px solid #40c0a0',
          borderRadius: 20, padding: '5px 14px', fontSize: 12,
          color: '#40c0a0', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          Path trace: <strong>{pathTracerNodeId}</strong>
          {' '}— Shift+click same node or background to clear
        </div>
      )}
      {pathTracerToast && (
        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#2a0808', border: '1px solid #d04040',
          borderRadius: 20, padding: '5px 14px', fontSize: 12,
          color: '#d04040', pointerEvents: 'none',
        }}>
          {pathTracerToast}
        </div>
      )}
    </div>
  )
}
