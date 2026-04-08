import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { NodeType, NodeStatus, DayBlock, SceneTransition } from '../../types/project'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import { FieldRow } from './FieldRow'
import { BranchList } from './BranchList'
import { AddChoicesForm } from './AddChoicesForm'
import { FlowControls } from './FlowControls'
import { Breadcrumb } from './Breadcrumb'
import styles from './DetailPanel.module.css'

// ─── Type / status option lists ───────────────────────────────────────────────

const NODE_TYPE_OPTIONS: Array<{ value: NodeType; label: string }> = [
  { value: 'scene',    label: 'Scene'    },
  { value: 'decision', label: 'Decision' },
  { value: 'grok',     label: 'Grok'     },
  { value: 'death',    label: 'Death'    },
  { value: 'ending',   label: 'Ending'   },
]

const DAY_BLOCK_OPTIONS: Array<{ value: DayBlock; label: string }> = [
  { value: 'Morning',   label: 'Morning'   },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Evening',   label: 'Evening'   },
  { value: 'Night',     label: 'Night'     },
  { value: 'All',       label: 'All Day'   },
]

const TRANSITION_OPTIONS: Array<{ value: SceneTransition; label: string }> = [
  { value: 'fade',        label: 'Fade'       },
  { value: 'cut',         label: 'Cut'        },
  { value: 'slide-left',  label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right'},
]

// ─── Character Tag Input ──────────────────────────────────────────────────────

interface CharTagInputProps {
  chars: string[]
  onChange: (chars: string[]) => void
}

function CharTagInput({ chars, onChange }: CharTagInputProps): React.ReactElement {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault()
      const newChar = inputVal.trim().replace(/,/g, '')
      if (!chars.includes(newChar)) {
        recordSnapshot()
        onChange([...chars, newChar])
      }
      setInputVal('')
    } else if (e.key === 'Backspace' && !inputVal && chars.length > 0) {
      recordSnapshot()
      onChange(chars.slice(0, -1))
    }
  }

  const removeChar = (char: string) => {
    recordSnapshot()
    onChange(chars.filter((c) => c !== char))
  }

  return (
    <div className={styles.tagWrap} onClick={() => inputRef.current?.focus()}>
      {chars.map((char) => (
        <span key={char} className={styles.tag}>
          {char}
          <button className={styles.tagRemove} onClick={() => removeChar(char)} title={`Remove ${char}`}>
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className={styles.tagInput}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={chars.length === 0 ? 'Add characters…' : ''}
      />
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function DetailPanel(): React.ReactElement {
  const activeNodeId = useUIStore((s) => s.activeNodeId)
  const panelOpen = useUIStore((s) => s.panelOpen)
  const closePanel = useUIStore((s) => s.closePanel)
  const openSceneMode = useUIStore((s) => s.openSceneMode)
  const setActiveNode = useUIStore((s) => s.setActiveNode)

  const projectNodes = useProjectStore((s) => s.project.nodes)
  const updateNode = useProjectStore((s) => s.updateNode)
  const deleteNode = useProjectStore((s) => s.deleteNode)
  const addNode = useProjectStore((s) => s.addNode)
  const deleteEdge = useProjectStore((s) => s.deleteEdge)
  const getEdgesFrom = useProjectStore((s) => s.getEdgesFrom)
  const getEdgesTo = useProjectStore((s) => s.getEdgesTo)
  const getExistingPaths = useProjectStore((s) => s.getExistingPaths)
  const getNode = useProjectStore((s) => s.getNode)

  const [showChoicesForm, setShowChoicesForm] = useState(false)

  // When active node changes, hide choices form
  useEffect(() => {
    setShowChoicesForm(false)
  }, [activeNodeId])

  const node = activeNodeId ? projectNodes.find((n) => n.id === activeNodeId) ?? null : null

  // ── Debounced field updater ──────────────────────────────────────────────
  const DEBOUNCE_MS = 800
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const debouncedUpdate = useCallback(
    (field: string, value: unknown) => {
      if (timersRef.current[field]) clearTimeout(timersRef.current[field])
      timersRef.current[field] = setTimeout(() => {
        if (!activeNodeId) return
        recordSnapshot()
        updateNode(activeNodeId, { [field]: value } as Parameters<typeof updateNode>[1])
      }, DEBOUNCE_MS)
    },
    [activeNodeId, updateNode],
  )

  // Immediate (non-debounced) update for things like status & type buttons
  const immediateUpdate = useCallback(
    (patch: Parameters<typeof updateNode>[1]) => {
      if (!activeNodeId) return
      recordSnapshot()
      updateNode(activeNodeId, patch)
    },
    [activeNodeId, updateNode],
  )

  // ── Title inline edit ────────────────────────────────────────────────────
  const [localTitle, setLocalTitle] = useState(node?.title ?? '')
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalTitle(node?.title ?? '')
  }, [node?.title, activeNodeId])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalTitle(val)
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(() => {
      if (!activeNodeId) return
      recordSnapshot()
      updateNode(activeNodeId, { title: val })
    }, DEBOUNCE_MS)
  }

  // ── Edges ────────────────────────────────────────────────────────────────
  const outgoingEdges = node ? getEdgesFrom(node.id) : []
  const incomingEdges = node ? getEdgesTo(node.id) : []

  // ── Connections section ──────────────────────────────────────────────────
  const handleRemoveEdge = (edgeId: string) => {
    recordSnapshot()
    deleteEdge(edgeId)
  }

  // ── Delete node ──────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!node) return
    if (!window.confirm(`Delete node "${node.title || node.id}"? This cannot be undone.`)) return
    recordSnapshot()
    // Remove all connected edges
    const edgesFrom = getEdgesFrom(node.id)
    const edgesTo = getEdgesTo(node.id)
    edgesFrom.forEach((e) => deleteEdge(e.id))
    edgesTo.forEach((e) => deleteEdge(e.id))
    deleteNode(node.id)
    closePanel()
  }

  // ── Duplicate node ────────────────────────────────────────────────────────
  const handleDuplicate = () => {
    if (!node) return
    recordSnapshot()
    const existingIds = new Set(projectNodes.map((n) => n.id))
    let newId = node.id + '-copy'
    let suffix = 1
    while (existingIds.has(newId)) newId = `${node.id}-copy${++suffix}`
    const dupNode = {
      ...node,
      id: newId,
      x: node.x + 40,
      y: node.y + 40,
      title: `${node.title} (copy)`,
    }
    addNode(dupNode)
    setActiveNode(newId)
  }

  // ── Panel visibility: always render for animation, use class for slide ───
  const isVisible = panelOpen && !!node

  return (
    <aside
      className={`${styles.panel} ${!isVisible ? styles.closed : ''}`}
      role="complementary"
      aria-label="Node detail panel"
    >
      {node && (
        <>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <div className={styles.nodeId}>{node.id}</div>
              <span className={`${styles.badge} ${styles[node.type]}`}>{node.type}</span>
              <input
                className={styles.titleInput}
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="Node title…"
                aria-label="Node title"
              />
            </div>
            <button className={styles.closeBtn} onClick={closePanel} title="Close panel">
              ×
            </button>
          </div>

          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Status row */}
          <div className={styles.statusRow}>
            {(['todo', 'inprog', 'done'] as NodeStatus[]).map((s) => (
              <button
                key={s}
                className={`${styles.statusBtn} ${node.status === s ? `${styles.active} ${styles[s]}` : ''}`}
                onClick={() => immediateUpdate({ status: s })}
              >
                {s === 'todo' ? 'Todo' : s === 'inprog' ? 'In Progress' : 'Done'}
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div className={styles.body}>
            {/* Add Choices Form (above fields, when toggled) */}
            {showChoicesForm && (
              <AddChoicesForm node={node} onClose={() => setShowChoicesForm(false)} />
            )}

            {/* Core fields */}
            <div className={styles.section}>
              <FieldRow
                label="Type"
                value={node.type}
                onChange={(v) => immediateUpdate({ type: v as NodeType })}
                type="select"
                options={NODE_TYPE_OPTIONS}
                debounceMs={0}
              />

              <div className={styles.fieldRowGroup}>
                <FieldRow
                  label="Day"
                  value={node.day !== null ? String(node.day) : ''}
                  onChange={(v) => debouncedUpdate('day', v === '' ? null : parseInt(v, 10) || null)}
                  type="number"
                  placeholder="—"
                />
                <FieldRow
                  label="Block"
                  value={node.block ?? ''}
                  onChange={(v) => immediateUpdate({ block: (v as DayBlock) || null })}
                  type="select"
                  options={[{ value: '', label: '—' }, ...DAY_BLOCK_OPTIONS]}
                  debounceMs={0}
                />
              </div>

              <FieldRow
                label="Path"
                value={node.path}
                onChange={(v) => debouncedUpdate('path', v)}
                placeholder="e.g. chapter-1/intro"
                autocompleteItems={getExistingPaths()}
              />

              <FieldRow
                label="Trigger"
                value={node.trigger}
                onChange={(v) => debouncedUpdate('trigger', v)}
                placeholder="Condition to reach this node…"
              />

              <FieldRow
                label="Transition"
                value={node.transition}
                onChange={(v) => immediateUpdate({ transition: v as SceneTransition })}
                type="select"
                options={TRANSITION_OPTIONS}
                debounceMs={0}
              />
            </div>

            {/* Summary */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Summary</div>
              <FieldRow
                label=""
                value={node.summary}
                onChange={(v) => debouncedUpdate('summary', v)}
                type="textarea"
                autoGrow
                placeholder="Brief summary of this scene…"
              />
            </div>

            {/* Characters */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Characters</div>
              <CharTagInput
                chars={node.chars}
                onChange={(chars) => {
                  recordSnapshot()
                  updateNode(node.id, { chars })
                }}
              />
            </div>

            {/* Branches */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Branches</div>
              <BranchList node={node} />
            </div>

            {/* Connections */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Connections</div>

              {outgoingEdges.length > 0 && (
                <>
                  <div className={styles.connSubLabel}>Outgoing</div>
                  <div className={styles.connChipsWrap} style={{ marginBottom: 8 }}>
                    {outgoingEdges.map((edge) => {
                      const target = getNode(edge.to)
                      return (
                        <span key={edge.id} className={styles.connChip}>
                          <span onClick={() => setActiveNode(edge.to)} style={{ cursor: 'pointer' }}>
                            {target ? (target.title || edge.to) : edge.to}
                            {edge.label ? ` [${edge.label}]` : ''}
                          </span>
                          <button
                            className={styles.connChipRemove}
                            onClick={() => handleRemoveEdge(edge.id)}
                            title="Remove connection"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </>
              )}

              {incomingEdges.length > 0 && (
                <>
                  <div className={styles.connSubLabel}>Incoming</div>
                  <div className={styles.connChipsWrap}>
                    {incomingEdges.map((edge) => {
                      const source = getNode(edge.from)
                      return (
                        <button
                          key={edge.id}
                          className={`${styles.connChip} ${styles.incoming}`}
                          onClick={() => setActiveNode(edge.from)}
                          title={`Go to ${edge.from}`}
                        >
                          {source ? (source.title || edge.from) : edge.from}
                          {edge.label ? ` [${edge.label}]` : ''}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {outgoingEdges.length === 0 && incomingEdges.length === 0 && (
                <div style={{ fontSize: 12, color: '#555570' }}>No connections yet.</div>
              )}
            </div>

            {/* Scene Content Summary */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Scene Content</div>
              <div className={styles.sceneContentRow}>
                <div className={styles.sceneContentInfo}>
                  <span className={styles.sceneContentIcon}>🎬</span>
                  <span style={{ fontSize: 12, color: '#a0a0c0' }}>
                    {node.dialogueLines.length} dialogue line{node.dialogueLines.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  className={styles.editSceneBtn}
                  onClick={() => openSceneMode(node.id)}
                >
                  Edit Scene
                </button>
              </div>
            </div>

            {/* Grok Handoff */}
            {(node.type === 'grok' || node.grokHandoff) && (
              <div className={styles.section}>
                <div className={styles.sectionLabel} style={{ color: '#c084fc' }}>Grok Handoff</div>
                <FieldRow
                  label=""
                  value={node.grokHandoff}
                  onChange={(v) => debouncedUpdate('grokHandoff', v)}
                  type="textarea"
                  autoGrow
                  grokTint
                  placeholder="Instructions for AI handoff…"
                  rows={4}
                />
              </div>
            )}

            {/* Dialogue / Notes */}
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Notes / Dialogue Draft</div>
              <FieldRow
                label=""
                value={node.dialogue}
                onChange={(v) => debouncedUpdate('dialogue', v)}
                type="textarea"
                autoGrow
                placeholder="Rough dialogue, notes, ideas…"
                rows={4}
              />
            </div>

            {/* Actions row */}
            <div className={styles.actionsRow}>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                onClick={() => openSceneMode(node.id)}
              >
                Edit Scene
              </button>
              <button
                className={styles.actionBtn}
                onClick={handleDuplicate}
              >
                Duplicate
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Sticky FlowControls */}
          <FlowControls
            node={node}
            showChoicesForm={showChoicesForm}
            onToggleChoicesForm={() => setShowChoicesForm((v) => !v)}
          />
        </>
      )}
    </aside>
  )
}
