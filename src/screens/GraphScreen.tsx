import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../store'
import { makeNode } from '../types'
import type { StoryNode, Edge } from '../types'

const NW = 150   // node width
const NH = 54    // node height
const NR = 10    // corner radius

const TYPE_COLOR: Record<string, string> = {
  scene:    '#4a80d4',
  decision: '#d4a44a',
  death:    '#e06060',
  ending:   '#60c480',
  grok:     '#9060d0',
}

const STATUS_DOT: Record<string, string> = {
  todo:   '#5e6e8a',
  inprog: '#d4a44a',
  done:   '#60c480',
}

interface Props {
  onEditNode: (id: string) => void
  onCharacters: () => void
  onHome: () => void
}

interface Transform { tx: number; ty: number; scale: number }
type Mode = 'default' | 'linking'

export default function GraphScreen({ onEditNode, onCharacters, onHome }: Props) {
  const { project, isDirty, addNode, updateNode, deleteNode, addEdge, deleteEdge, serialize, markSaved } = useStore(s => ({
    project: s.project,
    isDirty: s.isDirty,
    addNode: s.addNode,
    updateNode: s.updateNode,
    deleteNode: s.deleteNode,
    addEdge: s.addEdge,
    deleteEdge: s.deleteEdge,
    serialize: s.serialize,
    markSaved: s.markSaved,
  }))

  const [tf, setTf] = useState<Transform>({ tx: 0, ty: 0, scale: 1 })
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('default')
  const [linkSource, setLinkSource] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('')

  const svgRef = useRef<SVGSVGElement>(null)
  // Pointer tracking
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pan = useRef<{ startTx: number; startTy: number; startX: number; startY: number } | null>(null)
  const pinch = useRef<{ dist: number; startScale: number; startTx: number; startTy: number; cx: number; cy: number } | null>(null)
  const drag = useRef<{ nodeId: string; startNx: number; startNy: number; startX: number; startY: number } | null>(null)
  const tapStart = useRef<{ x: number; y: number; time: number; nodeId: string | null } | null>(null)

  // Fit all nodes on mount
  useEffect(() => {
    if (!svgRef.current || project.nodes.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const xs = project.nodes.map(n => n.x)
    const ys = project.nodes.map(n => n.y)
    const minX = Math.min(...xs) - 40
    const minY = Math.min(...ys) - 40
    const maxX = Math.max(...xs) + NW + 40
    const maxY = Math.max(...ys) + NH + 40
    const scaleX = rect.width / (maxX - minX)
    const scaleY = rect.height / (maxY - minY)
    const scale = Math.min(Math.max(scaleX, scaleY) * 0.85, 1.2)
    setTf({
      scale,
      tx: (rect.width - (maxX - minX) * scale) / 2 - minX * scale,
      ty: (rect.height - (maxY - minY) * scale) / 2 - minY * scale,
    })
  }, [])

  function screenToCanvas(sx: number, sy: number) {
    if (!svgRef.current) return { x: 0, y: 0 }
    const r = svgRef.current.getBoundingClientRect()
    return { x: (sx - r.left - tf.tx) / tf.scale, y: (sy - r.top - tf.ty) / tf.scale }
  }

  function hitNode(cx: number, cy: number): StoryNode | null {
    return project.nodes.find(n =>
      cx >= n.x && cx <= n.x + NW && cy >= n.y && cy <= n.y + NH
    ) ?? null
  }

  function hitEdge(sx: number, sy: number): Edge | null {
    const { x: cx, y: cy } = screenToCanvas(sx, sy)
    for (const e of project.edges) {
      const from = project.nodes.find(n => n.id === e.from)
      const to   = project.nodes.find(n => n.id === e.to)
      if (!from || !to) continue
      const fx = from.x + NW / 2, fy = from.y + NH / 2
      const tx2 = to.x + NW / 2, ty2 = to.y + NH / 2
      // Line segment distance
      const dx = tx2 - fx, dy = ty2 - fy
      const len2 = dx*dx + dy*dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((cx - fx) * dx + (cy - fy) * dy) / len2))
      const px = fx + t * dx - cx
      const py = fy + t * dy - cy
      if (Math.sqrt(px*px + py*py) < 16 / tf.scale) return e
    }
    return null
  }

  function ptrDist() {
    const pts = Array.from(ptrs.current.values())
    if (pts.length < 2) return 0
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
  }

  function ptrCenter() {
    const pts = Array.from(ptrs.current.values())
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
  }

  function onPtrDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (ptrs.current.size === 2) {
      drag.current = null
      pan.current = null
      pinch.current = { dist: ptrDist(), startScale: tf.scale, startTx: tf.tx, startTy: tf.ty, ...ptrCenter() }
      return
    }

    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY)
    const hit = hitNode(cx, cy)
    tapStart.current = { x: e.clientX, y: e.clientY, time: Date.now(), nodeId: hit?.id ?? null }

    if (hit) {
      drag.current = { nodeId: hit.id, startNx: hit.x, startNy: hit.y, startX: e.clientX, startY: e.clientY }
    } else {
      pan.current = { startTx: tf.tx, startTy: tf.ty, startX: e.clientX, startY: e.clientY }
    }
  }

  function onPtrMove(e: React.PointerEvent) {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinch.current && ptrs.current.size === 2) {
      const dist = ptrDist()
      const { cx, cy } = pinch.current
      const newScale = Math.max(0.2, Math.min(3, pinch.current.startScale * (dist / pinch.current.dist)))
      if (!svgRef.current) return
      const r = svgRef.current.getBoundingClientRect()
      const originX = cx - r.left
      const originY = cy - r.top
      const newTx = originX - (originX - pinch.current.startTx) * (newScale / pinch.current.startScale)
      const newTy = originY - (originY - pinch.current.startTy) * (newScale / pinch.current.startScale)
      setTf({ tx: newTx, ty: newTy, scale: newScale })
      return
    }

    if (drag.current) {
      const dx = (e.clientX - drag.current.startX) / tf.scale
      const dy = (e.clientY - drag.current.startY) / tf.scale
      updateNode(drag.current.nodeId, { x: drag.current.startNx + dx, y: drag.current.startNy + dy })
      return
    }

    if (pan.current) {
      setTf(t => ({
        ...t,
        tx: pan.current!.startTx + (e.clientX - pan.current!.startX),
        ty: pan.current!.startTy + (e.clientY - pan.current!.startY),
      }))
    }
  }

  function onPtrUp(e: React.PointerEvent) {
    ptrs.current.delete(e.pointerId)

    if (ptrs.current.size < 2) pinch.current = null

    const ts = tapStart.current
    if (ts && Date.now() - ts.time < 300) {
      const moved = Math.hypot(e.clientX - ts.x, e.clientY - ts.y)
      if (moved < 12) {
        // Tap
        if (mode === 'linking') {
          handleLinkTap(ts.nodeId)
        } else if (ts.nodeId) {
          setSelected(s => s === ts.nodeId ? null : ts.nodeId)
        } else {
          // Tap on empty: deselect, also check if tapping edge
          const edge = hitEdge(ts.x, ts.y)
          if (edge) {
            if (confirm(`Delete edge "${edge.label || `${edge.from} → ${edge.to}`}"?`)) deleteEdge(edge.id)
          } else {
            setSelected(null)
          }
        }
      }
    }

    tapStart.current = null
    drag.current = null
    pan.current = null
  }

  function handleLinkTap(nodeId: string | null) {
    if (!nodeId) { setMode('default'); setLinkSource(null); return }
    if (!linkSource) {
      setLinkSource(nodeId)
      return
    }
    if (linkSource === nodeId) { setMode('default'); setLinkSource(null); return }
    // Check not duplicate
    const exists = project.edges.find(e => e.from === linkSource && e.to === nodeId)
    if (!exists) {
      addEdge({ id: crypto.randomUUID(), from: linkSource, to: nodeId, label: '', desc: '', isDeath: false })
    }
    setLinkSource(null)
    setMode('default')
  }

  function handleAddNode() {
    const selectedNode = project.nodes.find(n => n.id === selected)
    const x = selectedNode ? selectedNode.x + NW + 60 : (project.nodes.length * 30 + 200)
    const y = selectedNode ? selectedNode.y : (project.nodes.length * 20 + 200)
    const newNode = makeNode(crypto.randomUUID(), x, y)
    addNode(newNode)
    if (selected) {
      addEdge({ id: crypto.randomUUID(), from: selected, to: newNode.id, label: '', desc: '', isDeath: false })
    }
    setSelected(newNode.id)
  }

  function handleDelete() {
    if (!selected) return
    if (!confirm('Delete this scene and all its connections?')) return
    deleteNode(selected)
    setSelected(null)
  }

  function handleSave() {
    const content = serialize()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}.nflow`
    a.click()
    URL.revokeObjectURL(url)
    markSaved()
    setSaveStatus('Saved!')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  // Wheel zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (!svgRef.current) return
    const r = svgRef.current.getBoundingClientRect()
    const ox = e.clientX - r.left
    const oy = e.clientY - r.top
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setTf(t => {
      const newScale = Math.max(0.2, Math.min(3, t.scale * factor))
      return {
        scale: newScale,
        tx: ox - (ox - t.tx) * (newScale / t.scale),
        ty: oy - (oy - t.ty) * (newScale / t.scale),
      }
    })
  }

  const selectedNode = project.nodes.find(n => n.id === selected) ?? null

  // Render edge path (cubic bezier)
  function edgePath(from: StoryNode, to: StoryNode) {
    const x1 = from.x + NW / 2, y1 = from.y + NH / 2
    const x2 = to.x + NW / 2, y2 = to.y + NH / 2
    const cx1 = x1 + (x2 - x1) * 0.5
    const cy1 = y1
    const cx2 = x1 + (x2 - x1) * 0.5
    const cy2 = y2
    return `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`
  }

  // Arrowhead endpoint
  function arrowEnd(from: StoryNode, to: StoryNode) {
    const x1 = from.x + NW / 2, y1 = from.y + NH / 2
    const x2 = to.x + NW / 2, y2 = to.y + NH / 2
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    // Back off from node edge
    const margin = NH / 2 + 4
    return { x: x2 - dx / len * margin, y: y2 - dy / len * margin, dx: dx / len, dy: dy / len }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', userSelect: 'none' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', background: '#0d1117',
        borderBottom: '1px solid #1e2736',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <button className="icon-btn" onClick={onHome} title="Home">←</button>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#e0e6f0' }}>{project.name}</div>
        {isDirty && <span style={{ fontSize: 11, color: '#d4a44a' }}>●</span>}
        {saveStatus && <span style={{ fontSize: 12, color: '#60c480' }}>{saveStatus}</span>}
        <button className="icon-btn" onClick={handleSave} title="Download .nflow">💾</button>
        <button className="icon-btn" onClick={onCharacters} title="Characters">👥</button>
      </div>

      {/* Graph canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          onPointerDown={onPtrDown}
          onPointerMove={onPtrMove}
          onPointerUp={onPtrUp}
          onPointerCancel={onPtrUp}
          onWheel={onWheel}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#3a4a6a" />
            </marker>
            <marker id="arrow-sel" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#4a80d4" />
            </marker>
          </defs>
          <g transform={`translate(${tf.tx},${tf.ty}) scale(${tf.scale})`}>
            {/* Edges */}
            {project.edges.map(e => {
              const from = project.nodes.find(n => n.id === e.from)
              const to   = project.nodes.find(n => n.id === e.to)
              if (!from || !to) return null
              const isSel = selected === e.from || selected === e.to
              return (
                <g key={e.id}>
                  <path
                    d={edgePath(from, to)}
                    fill="none"
                    stroke={isSel ? '#4a80d4' : '#2a3a56'}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    markerEnd={isSel ? 'url(#arrow-sel)' : 'url(#arrow)'}
                    opacity={isSel ? 1 : 0.6}
                  />
                  {e.label && (() => {
                    const mx = (from.x + to.x) / 2 + NW / 2
                    const my = (from.y + to.y) / 2 + NH / 2
                    return (
                      <text x={mx} y={my - 6} textAnchor="middle" fontSize={11} fill="#5e7a9a">
                        {e.label}
                      </text>
                    )
                  })()}
                </g>
              )
            })}

            {/* Link mode preview */}
            {mode === 'linking' && linkSource && (() => {
              const src = project.nodes.find(n => n.id === linkSource)
              if (!src) return null
              return (
                <circle cx={src.x + NW / 2} cy={src.y + NH / 2} r={NW / 2 + 8}
                  fill="none" stroke="#9060d0" strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />
              )
            })()}

            {/* Nodes */}
            {project.nodes.map(n => {
              const isSelected = n.id === selected
              const isLinkSrc = n.id === linkSource
              const color = TYPE_COLOR[n.type] ?? '#4a80d4'
              return (
                <g key={n.id}>
                  {/* Shadow */}
                  <rect x={n.x + 2} y={n.y + 4} width={NW} height={NH} rx={NR}
                    fill="#000" opacity={0.3} />
                  {/* Main rect */}
                  <rect
                    x={n.x} y={n.y} width={NW} height={NH} rx={NR}
                    fill={isSelected ? '#1a2844' : '#161c2e'}
                    stroke={isSelected ? color : isLinkSrc ? '#9060d0' : '#232f48'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  {/* Color left bar */}
                  <rect x={n.x} y={n.y} width={5} height={NH} rx={NR}
                    fill={color} />
                  <rect x={n.x + 5} y={n.y} width={6} height={NH}
                    fill={color} opacity={0.15} />
                  {/* Title */}
                  <text
                    x={n.x + 18} y={n.y + 22}
                    fontSize={13} fontWeight={700} fill={isSelected ? '#e8f0ff' : '#c0cce0'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.title.length > 15 ? n.title.slice(0, 14) + '…' : n.title}
                  </text>
                  {/* Type + status row */}
                  <text
                    x={n.x + 18} y={n.y + 38}
                    fontSize={10} fill="#5e7a9a"
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.type.toUpperCase()}
                  </text>
                  {/* Status dot */}
                  <circle cx={n.x + NW - 14} cy={n.y + NH / 2} r={5}
                    fill={STATUS_DOT[n.status] ?? '#5e6e8a'} />
                </g>
              )
            })}
          </g>
        </svg>

        {/* FAB: Add node */}
        <button
          onClick={handleAddNode}
          style={{
            position: 'absolute', bottom: 24, right: 24,
            width: 56, height: 56, borderRadius: 28,
            background: '#4a80d4', color: '#fff', fontSize: 28,
            border: 'none', boxShadow: '0 4px 20px rgba(74,128,212,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
          title="Add scene"
        >+</button>

        {/* Link mode button */}
        <button
          onClick={() => { setMode(m => m === 'linking' ? 'default' : 'linking'); setLinkSource(null) }}
          style={{
            position: 'absolute', bottom: 24, right: 92,
            width: 48, height: 48, borderRadius: 24,
            background: mode === 'linking' ? '#9060d0' : '#1e2a3e',
            color: mode === 'linking' ? '#fff' : '#7a8aaa',
            fontSize: 20, border: '1px solid #2a3a56',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
          title="Link scenes"
        >⇝</button>
      </div>

      {/* Bottom sheet: selected node */}
      {selectedNode && (
        <div style={{
          background: '#111827', borderTop: '1px solid #1e2736',
          padding: '16px 20px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}>
          {/* Node header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 8, height: 44, borderRadius: 4, flexShrink: 0,
              background: TYPE_COLOR[selectedNode.type] ?? '#4a80d4',
              marginTop: 2,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#e0e8ff', lineHeight: 1.2 }}>
                {selectedNode.title}
              </div>
              <div style={{ fontSize: 12, color: '#5e7a9a', marginTop: 3 }}>
                {selectedNode.type} · {selectedNode.status}
                {selectedNode.path ? ` · ${selectedNode.path}` : ''}
              </div>
            </div>
            <button style={{
              background: 'none', border: 'none', fontSize: 20,
              color: '#4a5a7a', padding: 4, cursor: 'pointer',
            }} onClick={() => setSelected(null)}>✕</button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="sheet-btn primary" onClick={() => onEditNode(selectedNode.id)}>
              ✏️ Edit
            </button>
            <button className="sheet-btn"
              onClick={() => {
                const newNode = makeNode(crypto.randomUUID(), selectedNode.x + NW + 60, selectedNode.y)
                addNode(newNode)
                addEdge({ id: crypto.randomUUID(), from: selectedNode.id, to: newNode.id, label: '', desc: '', isDeath: false })
                setSelected(newNode.id)
              }}>
              + Branch
            </button>
            <button className="sheet-btn danger" onClick={handleDelete}>
              🗑
            </button>
          </div>

          {/* Connections summary */}
          {(() => {
            const outgoing = project.edges.filter(e => e.from === selectedNode.id)
            const incoming = project.edges.filter(e => e.to === selectedNode.id)
            if (outgoing.length === 0 && incoming.length === 0) return null
            return (
              <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {incoming.length > 0 && (
                  <div style={{ fontSize: 12, color: '#5e7a9a' }}>
                    ← {incoming.length} incoming
                  </div>
                )}
                {outgoing.length > 0 && (
                  <div style={{ fontSize: 12, color: '#5e7a9a' }}>
                    → {outgoing.length} outgoing
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Link mode hint */}
      {mode === 'linking' && (
        <div style={{
          background: '#1a0f2e', borderTop: '1px solid #3a2060',
          padding: '12px 20px', textAlign: 'center',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}>
          <span style={{ fontSize: 13, color: '#b090e0' }}>
            {linkSource
              ? `Tap the destination scene →`
              : `Tap the source scene to start a connection`}
          </span>
          <button onClick={() => { setMode('default'); setLinkSource(null) }}
            style={{ marginLeft: 12, fontSize: 12, color: '#7a5aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
