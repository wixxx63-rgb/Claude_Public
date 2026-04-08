import React, { useEffect, useRef } from 'react'
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
  arrayMove,
} from '@dnd-kit/sortable'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { uid } from '../../utils/ids'
import type { DialogueLine } from '../../types/project'
import DialogueLineItem from './DialogueLineItem'
import styles from './SceneMode.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DialogueLineListProps {
  nodeId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const DialogueLineList: React.FC<DialogueLineListProps> = ({ nodeId }) => {
  const node = useProjectStore((s) => s.project.nodes.find((n) => n.id === nodeId))
  const addDialogueLine = useProjectStore((s) => s.addDialogueLine)
  const reorderDialogueLines = useProjectStore((s) => s.reorderDialogueLines)

  const activeLineId = useUIStore((s) => s.activeLineId)
  const setActiveLineId = useUIStore((s) => s.setActiveLineId)

  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef<number>(node?.dialogueLines.length ?? 0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Auto-scroll to bottom when a new line is added
  useEffect(() => {
    const currentLength = node?.dialogueLines.length ?? 0
    if (currentLength > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLengthRef.current = currentLength
  }, [node?.dialogueLines.length])

  if (!node) return null

  const lines = node.dialogueLines

  function handleAddLine() {
    const newLine: DialogueLine = {
      id: uid(),
      speaker: null,
      text: '',
      characterPose: null,
      position: 'center',
      sfx: null,
    }
    addDialogueLine(nodeId, newLine)
    setActiveLineId(newLine.id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = lines.findIndex((l) => l.id === active.id)
    const newIndex = lines.findIndex((l) => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(lines, oldIndex, newIndex)
    reorderDialogueLines(nodeId, reordered)
  }

  return (
    <div className={styles.dialogueLineList}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>Dialogue Lines</span>
        <span className={styles.lineCount}>{lines.length}</span>
      </div>

      <div className={styles.lineScroll}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lines.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {lines.map((line) => (
              <DialogueLineItem
                key={line.id}
                line={line}
                nodeId={nodeId}
                isSelected={activeLineId === line.id}
                onSelect={() => setActiveLineId(line.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {lines.length === 0 && (
          <div className={styles.emptyLines}>
            No lines yet. Click &quot;Add Line&quot; to begin.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className={styles.listFooter}>
        <button className={styles.addLineBtn} onClick={handleAddLine}>
          + Add Line
        </button>
      </div>
    </div>
  )
}

export default DialogueLineList
