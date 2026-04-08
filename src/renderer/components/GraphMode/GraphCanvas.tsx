import React, { useRef, useCallback, useEffect } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { CANVAS_BG } from '../../utils/theme'
import NodeCircle from './NodeCircle'
import EdgeLine from './EdgeLine'
import DragEdgePreview from './DragEdgePreview'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/** Generate a compact node id like N1, N2 … avoiding collisions */
function nextNodeId(existingIds: Set<string>): string {
  let n = 1
  while (existingIds.has(`N${n}`)) n++
  return `N${n}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GraphCanvasProps {
  /** Called when user mouseups on canvas to complete a link drag */
  onLinkDrop: (targetNodeId: string | null) => void
  /** Set by parent so DragEdgePreview can render inside the canvas layer */
  linkDragSourceId: string | null
  dragCursorWorld: { x: number; y: number } | null
}

// ─── Component ───────────────────────────────────────────────────────────────

const TOOLBAR_HEIGHT = 48
const ZOOM_MIN = 0.15
const ZOOM_MAX = 3.0
const ZOOM_FACTOR = 1.08

const GraphCanvas: React.FC<GraphCanvasProps> = ({
  onLinkDrop,
  linkDragSourceId,
  dragCursorWorld,
}) => {
  const nodes = useProjectStore((s) => s.project.nodes)
  const edges = useProjectStore((s) => s.project.edges)
  const addNode = useProjectStore((s) => s.addNode)

  const activeNodeId = useUIStore((s) => s.activeNodeId)
  const zoom = useUIStore((s) => s.zoom)
  const stageX = useUIStore((s) => s.stageX)
  const stageY = useUIStore((s) => s.stageY)
  const linkMode = useUIStore((s) => s.linkMode)
  const setActiveNode = useUIStore((s) => s.setActiveNode)
  const setZoom = useUIStore((s) => s.setZoom)
  const setStageOffset = useUIStore((s) => s.setStageOffset)
  const setLinkDragSource = useUIStore((s) => s.setLinkDragSource)

  const stageRef = useRef<Konva.Stage>(null)

  // Keep stage position in sync when the store changes externally (e.g. minimap jump)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.position({ x: stageX, y: stageY })
    stage.scale({ x: zoom, y: zoom })
    stage.batchDraw()
  }, [stageX, stageY, zoom])

  // ─── Wheel zoom ─────────────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      const delta = -e.evt.deltaY
      const newScale = clamp(
        delta > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR,
        ZOOM_MIN,
        ZOOM_MAX
      )

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }

      stage.scale({ x: newScale, y: newScale })
      stage.position(newPos)
      stage.batchDraw()

      setZoom(newScale)
      setStageOffset(newPos.x, newPos.y)
    },
    [setZoom, setStageOffset]
  )

  // ─── Stage drag (pan) ────────────────────────────────────────────────────────

  const handleStageDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Only update if the target is the stage itself (not a node dragged via custom logic)
      if (e.target === stageRef.current) {
        const stage = e.target as Konva.Stage
        setStageOffset(stage.x(), stage.y())
      }
    },
    [setStageOffset]
  )

  const handleStageDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target === stageRef.current) {
        const stage = e.target as Konva.Stage
        setStageOffset(stage.x(), stage.y())
      }
    },
    [setStageOffset]
  )

  // ─── Empty canvas click ──────────────────────────────────────────────────────

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only react if the click landed directly on the stage (background)
      if (e.target !== stageRef.current) return
      setActiveNode(null)

      // If in link mode dragging, cancel on empty click
      if (linkDragSourceId) {
        onLinkDrop(null)
        setLinkDragSource(null)
      }
    },
    [setActiveNode, linkDragSourceId, onLinkDrop, setLinkDragSource]
  )

  // ─── Double-click on empty canvas → create node ───────────────────────────

  const handleStageDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== stageRef.current) return
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const scale = stage.scaleX()
      const pos = stage.position()
      const worldX = (pointer.x - pos.x) / scale
      const worldY = (pointer.y - pos.y) / scale

      const existingIds = new Set(nodes.map((n) => n.id))
      const newId = nextNodeId(existingIds)

      const newNode = addNode({ id: newId, x: worldX, y: worldY })
      setActiveNode(newNode.id)
    },
    [nodes, addNode, setActiveNode]
  )

  // ─── Derived sets for dimming logic ─────────────────────────────────────────

  const directChildIds = React.useMemo(() => {
    if (!activeNodeId) return new Set<string>()
    const childSet = new Set<string>()
    for (const e of edges) {
      if (e.from === activeNodeId) childSet.add(e.to)
      if (e.to === activeNodeId) childSet.add(e.from)
    }
    return childSet
  }, [activeNodeId, edges])

  // ─── Link handle callback (forwarded from NodeCircle) ────────────────────────

  const handleLinkStart = useCallback(
    (nodeId: string, _screenX: number, _screenY: number) => {
      setLinkDragSource(nodeId)
    },
    [setLinkDragSource]
  )

  // ─── Drag source node (for DragEdgePreview) ───────────────────────────────

  const dragSourceNode = linkDragSourceId
    ? nodes.find((n) => n.id === linkDragSourceId) ?? null
    : null

  // ─── Viewport size ───────────────────────────────────────────────────────────

  const [vpSize, setVpSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight - TOOLBAR_HEIGHT,
  })

  useEffect(() => {
    const handleResize = () => {
      setVpSize({
        width: window.innerWidth,
        height: window.innerHeight - TOOLBAR_HEIGHT,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Stage
      ref={stageRef}
      width={vpSize.width}
      height={vpSize.height}
      style={{ background: CANVAS_BG }}
      // Enable pan via built-in draggable on the stage — but NOT on nodes.
      // Nodes set cancelBubble on mousedown so stage drag won't fire for them.
      draggable={!linkDragSourceId}
      x={stageX}
      y={stageY}
      scaleX={zoom}
      scaleY={zoom}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onDblClick={handleStageDblClick}
      onDragEnd={handleStageDragEnd}
      onDragMove={handleStageDragMove}
    >
      {/* ── Edges Layer ─────────────────────────────────────────────────── */}
      <Layer>
        {edges.map((edge) => {
          const fromNode = nodes.find((n) => n.id === edge.from)
          const toNode = nodes.find((n) => n.id === edge.to)
          if (!fromNode || !toNode) return null

          // Highlight if activeNodeId is null (no selection) or edge touches selected node
          const isHighlighted =
            activeNodeId === null ||
            edge.from === activeNodeId ||
            edge.to === activeNodeId

          return (
            <EdgeLine
              key={edge.id}
              edge={edge}
              fromNode={fromNode}
              toNode={toNode}
              isHighlighted={isHighlighted}
              zoom={zoom}
            />
          )
        })}
      </Layer>

      {/* ── Nodes Layer ─────────────────────────────────────────────────── */}
      <Layer>
        {nodes.map((node) => (
          <NodeCircle
            key={node.id}
            node={node}
            isSelected={node.id === activeNodeId}
            isDirectChild={directChildIds.has(node.id)}
            activeNodeId={activeNodeId}
            zoom={zoom}
            linkMode={linkMode}
            onLinkStart={handleLinkStart}
          />
        ))}
      </Layer>

      {/* ── Overlay Layer (drag preview + minimap placeholder) ───────────── */}
      <Layer>
        {dragSourceNode && dragCursorWorld && (
          <DragEdgePreview
            fromNode={dragSourceNode}
            toX={dragCursorWorld.x}
            toY={dragCursorWorld.y}
          />
        )}
      </Layer>
    </Stage>
  )
}

export default GraphCanvas
