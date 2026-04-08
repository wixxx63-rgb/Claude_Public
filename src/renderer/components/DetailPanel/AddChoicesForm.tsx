import React, { useState, useCallback } from 'react'
import type { StoryNode, Branch } from '../../types/project'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import { deriveChildId, spreadPositions } from '../../utils/ids'
import styles from './DetailPanel.module.css'

interface AddChoicesFormProps {
  node: StoryNode
  onClose: () => void
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const MAX_CHOICES = 6

// Maps existingEdge index → assigned choice letter (or null = unassigned)
type AssignmentMap = Record<string, string | null>

export function AddChoicesForm({ node, onClose }: AddChoicesFormProps): React.ReactElement {
  const allNodes = useProjectStore((s) => s.project.nodes)
  const addNode = useProjectStore((s) => s.addNode)
  const addEdge = useProjectStore((s) => s.addEdge)
  const updateNode = useProjectStore((s) => s.updateNode)
  const getEdgesFrom = useProjectStore((s) => s.getEdgesFrom)
  const setActiveNode = useUIStore((s) => s.setActiveNode)

  const existingEdges = getEdgesFrom(node.id)

  // Track assignment: edgeId → choice letter | 'unassigned' | null (pending)
  const [assignments, setAssignments] = useState<AssignmentMap>(() => {
    const init: AssignmentMap = {}
    existingEdges.forEach((e) => { init[e.id] = null })
    return init
  })

  // Choice texts: array of up to MAX_CHOICES strings
  const [choiceTexts, setChoiceTexts] = useState<string[]>(['', ''])

  const allExistingHandled = existingEdges.every(
    (e) => assignments[e.id] !== null,
  )

  const assignedLetters = new Set(
    Object.values(assignments).filter((v): v is string => v !== null && v !== 'unassigned'),
  )

  const availableLetters = CHOICE_LETTERS.filter((l) => !assignedLetters.has(l))

  const handleAssign = (edgeId: string, letter: string) => {
    setAssignments((prev) => {
      // If this letter was already assigned to another edge, clear that
      const cleared: AssignmentMap = {}
      for (const [k, v] of Object.entries(prev)) {
        cleared[k] = v === letter ? null : v
      }
      cleared[edgeId] = letter
      return cleared
    })
  }

  const handleUnassign = (edgeId: string) => {
    setAssignments((prev) => ({ ...prev, [edgeId]: 'unassigned' }))
  }

  const handleChoiceTextChange = (index: number, value: string) => {
    setChoiceTexts((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleAddRow = () => {
    if (choiceTexts.length < MAX_CHOICES) {
      setChoiceTexts((prev) => [...prev, ''])
    }
  }

  const handleConfirm = useCallback(() => {
    recordSnapshot()

    const existingIds = new Set(allNodes.map((n) => n.id))
    const nonEmptyChoices = choiceTexts
      .map((text, i) => ({ text: text.trim(), letter: CHOICE_LETTERS[assignedLetters.size + i] ?? CHOICE_LETTERS[i] }))
      .filter((c) => c.text.length > 0)

    // Build the full list: assigned existing edges + new choices
    const branches: Branch[] = []

    // Handle existing edges first (those assigned to a letter)
    const edgeLetterPairs: Array<{ letter: string; toId: string; edgeId: string }> = []
    for (const edge of existingEdges) {
      const assignment = assignments[edge.id]
      if (assignment && assignment !== 'unassigned') {
        edgeLetterPairs.push({ letter: assignment, toId: edge.to, edgeId: edge.id })
      }
    }

    // Sort by letter
    edgeLetterPairs.sort((a, b) => a.letter.localeCompare(b.letter))

    // Add branches for existing edges that were assigned a letter
    for (const pair of edgeLetterPairs) {
      const targetNode = allNodes.find((n) => n.id === pair.toId)
      branches.push({
        option: pair.letter,
        desc: targetNode?.title ?? pair.toId,
        leads: [pair.toId],
        effects: [],
        condition: null,
      })
    }

    // Determine positions for new nodes (spread below current node)
    const newChoicesWithoutEdge = nonEmptyChoices.filter((c) => {
      // Check if this letter already has an existing edge assignment
      return !edgeLetterPairs.some((p) => p.letter === c.letter)
    })

    // Re-letter to fill gaps after existing assignments
    const usedLetters = new Set(edgeLetterPairs.map((p) => p.letter))
    const availableForNew = CHOICE_LETTERS.filter((l) => !usedLetters.has(l))

    const positions = spreadPositions(node.x, node.y, newChoicesWithoutEdge.length)

    newChoicesWithoutEdge.forEach((choice, i) => {
      const letter = availableForNew[i] ?? choice.letter
      const newId = deriveChildId(node.id, existingIds)
      existingIds.add(newId)

      addNode({ id: newId, x: positions[i]?.x ?? node.x + (i + 1) * 240, y: positions[i]?.y ?? node.y + 220, title: choice.text })
      addEdge(node.id, newId, letter)

      branches.push({
        option: letter,
        desc: choice.text,
        leads: [newId],
        effects: [],
        condition: null,
      })
    })

    // Sort all branches by letter
    branches.sort((a, b) => a.option.localeCompare(b.option))

    // Update node: type → decision, add branches
    updateNode(node.id, {
      type: 'decision',
      branches: [...node.branches, ...branches],
    })

    onClose()
  }, [
    allNodes, addNode, addEdge, updateNode, node, choiceTexts,
    assignments, existingEdges, assignedLetters, onClose,
  ])

  return (
    <div className={styles.addChoicesForm}>
      <div className={styles.addChoicesTitle}>Add Choices</div>

      {/* Step 1: Handle existing edges */}
      {existingEdges.length > 0 && (
        <div>
          {existingEdges.map((edge) => {
            const targetNode = allNodes.find((n) => n.id === edge.to)
            const targetLabel = targetNode
              ? `${edge.to}: ${targetNode.title}`
              : edge.to
            const currentAssignment = assignments[edge.id]
            const isHandled = currentAssignment !== null

            return (
              <div key={edge.id} className={styles.existingEdgeRow}>
                <div className={styles.existingEdgeLabel}>
                  Connects to <strong style={{ color: '#7ab8ff' }}>{targetLabel}</strong> — assign to choice:
                </div>
                <div className={styles.existingEdgeBtns}>
                  {CHOICE_LETTERS.slice(0, MAX_CHOICES).map((letter) => {
                    const isOccupied =
                      Object.entries(assignments).some(
                        ([eid, v]) => eid !== edge.id && v === letter,
                      )
                    return (
                      <button
                        key={letter}
                        className={`${styles.assignBtn} ${currentAssignment === letter ? styles.selected : ''}`}
                        onClick={() => handleAssign(edge.id, letter)}
                        disabled={isOccupied}
                        title={isOccupied ? `Already assigned` : `Assign to choice ${letter}`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                  <button
                    className={`${styles.unassignBtn} ${currentAssignment === 'unassigned' ? styles.selected : ''}`}
                    onClick={() => handleUnassign(edge.id)}
                  >
                    Leave unassigned
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Step 2: New choice inputs */}
      {(existingEdges.length === 0 || allExistingHandled) && (
        <>
          {choiceTexts.map((text, i) => {
            // Determine what letter this choice will get
            const allUsed = new Set([
              ...Object.values(assignments).filter((v): v is string => v !== null && v !== 'unassigned'),
            ])
            const availableLettersForNew = CHOICE_LETTERS.filter((l) => !allUsed.has(l))
            const letter = availableLettersForNew[i] ?? CHOICE_LETTERS[i]

            return (
              <div key={i} className={styles.choiceInputRow}>
                <span className={styles.choiceLetterBadge}>{letter}</span>
                <input
                  className={styles.choiceInput}
                  value={text}
                  placeholder={`Choice ${letter} text…`}
                  onChange={(e) => handleChoiceTextChange(i, e.target.value)}
                />
              </div>
            )
          })}

          {choiceTexts.length < MAX_CHOICES && (
            <button className={styles.addChoiceRowBtn} onClick={handleAddRow}>
              + Add another choice
            </button>
          )}
        </>
      )}

      {existingEdges.length > 0 && !allExistingHandled && (
        <div style={{ fontSize: 11, color: '#666680', marginBottom: 10 }}>
          Handle all existing connections above to continue.
        </div>
      )}

      <div className={styles.choicesFormActions}>
        <button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={existingEdges.length > 0 && !allExistingHandled}
        >
          Confirm Choices
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
