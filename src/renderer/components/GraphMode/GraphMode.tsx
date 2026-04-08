import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import GraphCanvas from './GraphCanvas'
import Minimap from './Minimap'
import styles from './GraphMode.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EdgeLabelPopover {
  fromId: string
  toId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const GraphMode: React.FC = () => {
  const nodes = useProjectStore((s) => s.project.nodes)
  const addEdge = useProjectStore((s) => s.addEdge)

  const activeNodeId = useUIStore((s) => s.activeNodeId)
  const linkMode = useUIStore((s) => s.linkMode)
  const linkDragSource = useUIStore((s) => s.linkDragSource)
  const setActiveNode = useUIStore((s) => s.setActiveNode)
  const setStageOffset = useUIStore((s) => s.setStageOffset)
  const setLinkDragSource = useUIStore((s) => s.setLinkDragSource)

  // ─── Link drag cursor tracking ────────────────────────────────────────────

  // Cursor position in world-space coordinates (updated during link drag)
  const [dragCursorWorld, setDragCursorWorld] = useState<{ x: number; y: number } | null>(null)
  // Which node the cursor is hovering (for drop target detection)
  const hoverNodeIdRef = useRef<string | null>(null)

  // ─── Edge label popover state ─────────────────────────────────────────────

  const [popover, setPopover] = useState<EdgeLabelPopover | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Focus label input when popover opens
  useEffect(() => {
    if (popover && labelInputRef.current) {
      labelInputRef.current.focus()
    }
  }, [popover])

  // ─── Global mousemove/mouseup for link drag ───────────────────────────────

  useEffect(() => {
    if (!linkDragSource) {
      setDragCursorWorld(null)
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      // We need zoom + stageOffset to convert screen → world.
      // Read directly from the store singleton to avoid stale closure.
      const { zoom, stageX, stageY } = useUIStore.getState()
      const worldX = (e.clientX - stageX) / zoom
      const worldY = (e.clientY - (stageY + 48)) / zoom
      setDragCursorWorld({ x: worldX, y: worldY })

      // Detect hover node — find the closest node within radius 52
      const { project } = useProjectStore.getState()
      let closest: string | null = null
      let closestDist = 60 // slightly larger than radius for ease
      for (const node of project.nodes) {
        if (node.id === linkDragSource) continue
        const dx = worldX - node.x
        const dy = worldY - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < closestDist) {
          closestDist = dist
          closest = node.id
        }
      }
      hoverNodeIdRef.current = closest
    }

    const onMouseUp = (_e: MouseEvent) => {
      const targetId = hoverNodeIdRef.current
      hoverNodeIdRef.current = null
      setDragCursorWorld(null)

      if (targetId && targetId !== linkDragSource) {
        // Prompt for edge label
        setPopover({ fromId: linkDragSource, toId: targetId })
        setPendingLabel('')
      }

      setLinkDragSource(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [linkDragSource, setLinkDragSource])

  // ─── Popover confirm / cancel ─────────────────────────────────────────────

  const handlePopoverConfirm = useCallback(() => {
    if (!popover) return
    addEdge(popover.fromId, popover.toId, pendingLabel.trim())
    setPopover(null)
    setPendingLabel('')
  }, [popover, pendingLabel, addEdge])

  const handlePopoverCancel = useCallback(() => {
    setPopover(null)
    setPendingLabel('')
  }, [])

  const handlePopoverKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handlePopoverConfirm()
      if (e.key === 'Escape') handlePopoverCancel()
    },
    [handlePopoverConfirm, handlePopoverCancel]
  )

  // ─── Link drop callback from GraphCanvas ─────────────────────────────────

  const handleLinkDrop = useCallback(
    (targetNodeId: string | null) => {
      // This callback fires from GraphCanvas on empty canvas click during link drag.
      // The actual edge-creation flow is handled by the global mouseup above.
      // This exists as a safety cancel path.
      if (!targetNodeId) {
        setPopover(null)
        setLinkDragSource(null)
        setDragCursorWorld(null)
      }
    },
    [setLinkDragSource]
  )

  // ─── Keyboard: Escape closes panel / cancels link mode ───────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popover) {
          handlePopoverCancel()
          return
        }
        if (linkDragSource) {
          setLinkDragSource(null)
          setDragCursorWorld(null)
          return
        }
        setActiveNode(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [popover, linkDragSource, handlePopoverCancel, setLinkDragSource, setActiveNode])

  // ─── Minimap viewport jump ────────────────────────────────────────────────

  const handleViewportJump = useCallback(
    (worldX: number, worldY: number) => {
      const { zoom } = useUIStore.getState()
      const vpW = window.innerWidth
      const vpH = window.innerHeight - 48
      // Center the view on the clicked world position
      const newStageX = vpW / 2 - worldX * zoom
      const newStageY = vpH / 2 - worldY * zoom
      setStageOffset(newStageX, newStageY)
      // Zoom store update not needed — zoom unchanged
      // The canvas useEffect syncs stage.position from store
    },
    [setStageOffset]
  )

  // ─── Panel open state ─────────────────────────────────────────────────────

  const panelOpen = activeNodeId !== null

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className={styles.canvasArea}>
        <GraphCanvas
          onLinkDrop={handleLinkDrop}
          linkDragSourceId={linkDragSource}
          dragCursorWorld={dragCursorWorld}
        />

        {/* Minimap overlay */}
        <div className={styles.minimapWrap}>
          <Minimap onViewportJump={handleViewportJump} />
        </div>

        {/* Link mode hint banner */}
        {linkMode && (
          <div className={styles.linkModeHint}>
            Link mode — drag from a node handle to another node · Esc to cancel
          </div>
        )}
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────── */}
      {panelOpen && (
        <aside className={styles.panel}>
          {/* DetailPanel component will be rendered here once implemented.
              For now, show a placeholder so the layout works. */}
          <div className={styles.panelPlaceholder}>
            <span>
              <strong style={{ color: '#ccc' }}>{activeNodeId}</strong>
              <br />
              Detail Panel
              <br />
              <span style={{ color: '#555', fontSize: 11 }}>
                (DetailPanel component not yet implemented)
              </span>
            </span>
          </div>
        </aside>
      )}

      {/* ── Edge label popover ────────────────────────────────────────────── */}
      {popover && (
        <div
          className={styles.popoverBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) handlePopoverCancel()
          }}
        >
          <div className={styles.popover}>
            <h4>Add edge label (optional)</h4>
            <input
              ref={labelInputRef}
              className={styles.popoverInput}
              type="text"
              placeholder="Label…"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              onKeyDown={handlePopoverKeyDown}
            />
            <div className={styles.popoverActions}>
              <button className={styles.btnCancel} onClick={handlePopoverCancel}>
                Cancel
              </button>
              <button className={styles.btnConfirm} onClick={handlePopoverConfirm}>
                Create Edge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphMode
