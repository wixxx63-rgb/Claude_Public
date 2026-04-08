import React, { useRef, useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Branch, StoryNode } from '../../types/project'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import { uid, deriveChildId, spreadPositions } from '../../utils/ids'
import styles from './DetailPanel.module.css'

// ─── BranchItem ──────────────────────────────────────────────────────────────

interface BranchItemProps {
  branch: Branch
  index: number
  nodeId: string
  onChange: (index: number, patch: Partial<Branch>) => void
  onDelete: (index: number) => void
}

function BranchItem({ branch, index, nodeId, onChange, onDelete }: BranchItemProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `branch-${index}` })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const setActiveNode = useUIStore((s) => s.setActiveNode)
  const allNodes = useProjectStore((s) => s.project.nodes)
  const addNode = useProjectStore((s) => s.addNode)
  const addEdge = useProjectStore((s) => s.addEdge)
  const updateNode = useProjectStore((s) => s.updateNode)

  // Debounced field helpers
  const optionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const effectsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const condTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [localOption, setLocalOption] = useState(branch.option)
  const [localDesc, setLocalDesc] = useState(branch.desc)
  const [localEffects, setLocalEffects] = useState(branch.effects.join(', '))
  const [localCond, setLocalCond] = useState(branch.condition ?? '')

  const debounce = (
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    fn: () => void,
    ms = 800,
  ) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(fn, ms)
  }

  const handleCreateMissingNode = (leadId: string) => {
    recordSnapshot()
    const existingIds = new Set(allNodes.map((n) => n.id))
    const parentNode = allNodes.find((n) => n.id === nodeId)
    const pos = parentNode
      ? spreadPositions(parentNode.x, parentNode.y, 1)[0]
      : { x: 400, y: 400 }
    addNode({ id: leadId, x: pos.x, y: pos.y })
    addEdge(nodeId, leadId, branch.option)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.branchItem} ${isDragging ? styles.dragging : ''}`}
    >
      {/* Header row */}
      <div className={styles.branchItemHeader}>
        <span
          className={styles.branchHandle}
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          ⠿
        </span>

        <input
          className={styles.branchOptionInput}
          value={localOption}
          placeholder="A"
          onChange={(e) => {
            setLocalOption(e.target.value)
            debounce(optionTimerRef, () => onChange(index, { option: e.target.value }))
          }}
          maxLength={6}
          title="Choice label"
        />

        <input
          className={styles.branchDescInput}
          value={localDesc}
          placeholder="Branch description…"
          onChange={(e) => {
            setLocalDesc(e.target.value)
            debounce(descTimerRef, () => onChange(index, { desc: e.target.value }))
          }}
        />

        <button
          className={styles.branchDeleteBtn}
          onClick={() => onDelete(index)}
          title="Delete branch"
        >
          ×
        </button>
      </div>

      {/* Leads-to chips */}
      <div className={styles.branchLeadsWrap}>
        <span className={styles.branchLeadsLabel}>→</span>
        {branch.leads.map((leadId) => {
          const targetNode = allNodes.find((n) => n.id === leadId)
          if (targetNode) {
            return (
              <button
                key={leadId}
                className={styles.branchLeadChip}
                onClick={() => setActiveNode(leadId)}
                title={`Navigate to ${targetNode.title || leadId}`}
              >
                {targetNode.title || leadId}
              </button>
            )
          }
          return (
            <span key={leadId} className={`${styles.branchLeadChip} ${styles.branchLeadChipMissing}`}>
              {leadId}
              <button
                className={styles.branchCreateBtn}
                onClick={() => handleCreateMissingNode(leadId)}
                title={`Create node ${leadId}`}
              >
                Create
              </button>
            </span>
          )
        })}
      </div>

      {/* Effects */}
      <div className={styles.branchField}>
        <span className={styles.branchFieldLabel}>Effects</span>
        <input
          className={styles.branchFieldInput}
          value={localEffects}
          placeholder="e.g. trust+1, flagA=true"
          onChange={(e) => {
            setLocalEffects(e.target.value)
            debounce(effectsTimerRef, () =>
              onChange(index, {
                effects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              }),
            )
          }}
        />
      </div>

      {/* Condition */}
      <div className={styles.branchField}>
        <span className={styles.branchFieldLabel}>Condition</span>
        <input
          className={styles.branchFieldInput}
          value={localCond}
          placeholder="e.g. trust >= 2"
          onChange={(e) => {
            setLocalCond(e.target.value)
            debounce(condTimerRef, () =>
              onChange(index, { condition: e.target.value || null }),
            )
          }}
        />
      </div>
    </div>
  )
}

// ─── BranchList ───────────────────────────────────────────────────────────────

interface BranchListProps {
  node: StoryNode
}

export function BranchList({ node }: BranchListProps): React.ReactElement {
  const updateNode = useProjectStore((s) => s.updateNode)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = parseInt(String(active.id).replace('branch-', ''), 10)
      const newIndex = parseInt(String(over.id).replace('branch-', ''), 10)
      if (isNaN(oldIndex) || isNaN(newIndex)) return

      recordSnapshot()
      const reordered = arrayMove([...node.branches], oldIndex, newIndex)
      updateNode(node.id, { branches: reordered })
    },
    [node.branches, node.id, updateNode],
  )

  const handleChange = useCallback(
    (index: number, patch: Partial<Branch>) => {
      recordSnapshot()
      const updated = node.branches.map((b, i) => (i === index ? { ...b, ...patch } : b))
      updateNode(node.id, { branches: updated })
    },
    [node.branches, node.id, updateNode],
  )

  const handleDelete = useCallback(
    (index: number) => {
      recordSnapshot()
      const updated = node.branches.filter((_, i) => i !== index)
      updateNode(node.id, { branches: updated })
    },
    [node.branches, node.id, updateNode],
  )

  const handleAdd = useCallback(() => {
    recordSnapshot()
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const nextLetter = letters[node.branches.length] ?? String(node.branches.length + 1)
    const newBranch: Branch = {
      option: nextLetter,
      desc: '',
      leads: [],
      effects: [],
      condition: null,
    }
    updateNode(node.id, { branches: [...node.branches, newBranch] })
  }, [node.branches, node.id, updateNode])

  const sortableIds = node.branches.map((_, i) => `branch-${i}`)

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className={styles.branchList}>
            {node.branches.map((branch, i) => (
              <BranchItem
                key={`branch-item-${i}`}
                branch={branch}
                index={i}
                nodeId={node.id}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button className={styles.addBranchBtn} onClick={handleAdd}>
        + Add Branch
      </button>
    </div>
  )
}
