import React, { useRef, useEffect, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useProjectStore } from '../../store/useProjectStore'
import type { DialogueLine } from '../../types/project'
import AssetPicker from './AssetPicker'
import styles from './SceneMode.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DialogueLineItemProps {
  line: DialogueLine
  nodeId: string
  isSelected: boolean
  onSelect: () => void
}

// ─── Debounce Helper ─────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay: number, onSettle: (val: T) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(onSettle)
  callbackRef.current = onSettle

  return useCallback(
    (newValue: T) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        callbackRef.current(newValue)
      }, delay)
    },
    [delay]
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const DialogueLineItem: React.FC<DialogueLineItemProps> = ({
  line,
  nodeId,
  isSelected,
  onSelect,
}) => {
  const characters = useProjectStore((s) => s.project.characters)
  const assets = useProjectStore((s) => s.project.assets)
  const filePath = useProjectStore((s) => s.filePath)
  const updateDialogueLine = useProjectStore((s) => s.updateDialogueLine)
  const deleteDialogueLine = useProjectStore((s) => s.deleteDialogueLine)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // dnd-kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [line.text])

  const selectedChar = characters.find((c) => c.id === line.speaker)

  const debouncedTextUpdate = useDebounced(line.text, 500, (val) => {
    updateDialogueLine(nodeId, line.id, { text: val })
  })

  const [localText, setLocalText] = React.useState(line.text)

  // Sync localText if line.text changes externally (e.g. undo/redo)
  useEffect(() => {
    setLocalText(line.text)
  }, [line.text])

  // Derive projectDir for AssetPicker
  const projectDir = filePath
    ? filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
    : ''

  // Find the selected SFX asset name
  const sfxAsset = line.sfx ? assets.find((a) => a.id === line.sfx) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.lineItem} ${isSelected ? styles.lineItemSelected : ''}`}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        title="Drag to reorder"
      >
        ⠿
      </div>

      <div className={styles.lineBody}>
        {/* Row 1: Speaker + Pose + Position */}
        <div className={styles.lineRow}>
          {/* Speaker dropdown */}
          <select
            className={styles.speakerSelect}
            value={line.speaker ?? ''}
            onChange={(e) => {
              updateDialogueLine(nodeId, line.id, {
                speaker: e.target.value || null,
                characterPose: null,
              })
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Narration</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Pose dropdown */}
          <select
            className={styles.poseSelect}
            value={line.characterPose ?? ''}
            disabled={!selectedChar || selectedChar.sprites.length === 0}
            onChange={(e) => {
              updateDialogueLine(nodeId, line.id, {
                characterPose: e.target.value || null,
              })
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Default</option>
            {selectedChar?.sprites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Position select */}
          <div className={styles.positionGroup} onClick={(e) => e.stopPropagation()}>
            {(['left', 'center', 'right'] as const).map((pos) => (
              <button
                key={pos}
                className={`${styles.posBtn} ${line.position === pos ? styles.posBtnActive : ''}`}
                title={pos.charAt(0).toUpperCase() + pos.slice(1)}
                onClick={() => updateDialogueLine(nodeId, line.id, { position: pos })}
              >
                {pos === 'left' ? '◧' : pos === 'center' ? '◫' : '◨'}
              </button>
            ))}
          </div>

          {/* Delete button */}
          <button
            className={styles.deleteLineBtn}
            title="Delete line"
            onClick={(e) => {
              e.stopPropagation()
              deleteDialogueLine(nodeId, line.id)
            }}
          >
            ×
          </button>
        </div>

        {/* Row 2: Text area */}
        <textarea
          ref={textareaRef}
          className={styles.lineText}
          value={localText}
          placeholder="Enter dialogue text…"
          rows={1}
          onChange={(e) => {
            setLocalText(e.target.value)
            debouncedTextUpdate(e.target.value)
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Row 3: SFX picker */}
        <div className={styles.sfxRow} onClick={(e) => e.stopPropagation()}>
          <span className={styles.sfxLabel}>SFX:</span>
          <AssetPicker
            type="audio"
            value={line.sfx}
            onChange={(assetId) => updateDialogueLine(nodeId, line.id, { sfx: assetId })}
            projectDir={projectDir}
            compact
          />
          {sfxAsset && (
            <span className={styles.sfxName} title={sfxAsset.filename}>
              {sfxAsset.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default DialogueLineItem
