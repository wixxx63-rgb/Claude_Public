import React, { useState, useRef, useEffect } from 'react'
import type { StoryNode } from '../../types/project'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import styles from './DetailPanel.module.css'

interface FlowControlsProps {
  node: StoryNode
  showChoicesForm: boolean
  onToggleChoicesForm: () => void
}

export function FlowControls({ node, showChoicesForm, onToggleChoicesForm }: FlowControlsProps): React.ReactElement {
  const [showPrevDropdown, setShowPrevDropdown] = useState(false)
  const prevBtnRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const getEdgesFrom = useProjectStore((s) => s.getEdgesFrom)
  const getEdgesTo = useProjectStore((s) => s.getEdgesTo)
  const getNode = useProjectStore((s) => s.getNode)
  const createChildNode = useProjectStore((s) => s.createChildNode)
  const addEdge = useProjectStore((s) => s.addEdge)
  const setActiveNode = useUIStore((s) => s.setActiveNode)

  const incomingEdges = getEdgesTo(node.id)
  const outgoingEdges = getEdgesFrom(node.id)

  // "Next scene": a sequential edge has no label (or empty label)
  const sequentialEdge = outgoingEdges.find((e) => !e.label || e.label.trim() === '')

  const hasPrev = incomingEdges.length > 0
  const hasMultiplePrev = incomingEdges.length > 1

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showPrevDropdown) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        prevBtnRef.current &&
        !prevBtnRef.current.contains(e.target as Node)
      ) {
        setShowPrevDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPrevDropdown])

  const handlePrev = () => {
    if (!hasPrev) return
    if (hasMultiplePrev) {
      setShowPrevDropdown((v) => !v)
    } else {
      setActiveNode(incomingEdges[0].from)
    }
  }

  const handleNext = () => {
    if (sequentialEdge) {
      // Navigate to existing sequential destination
      setActiveNode(sequentialEdge.to)
    } else {
      // Create a new child node
      recordSnapshot()
      const child = createChildNode(node.id)
      if (child) {
        setActiveNode(child.id)
      }
    }
  }

  return (
    <div className={styles.flowControls}>
      {/* Previous */}
      <button
        ref={prevBtnRef}
        className={styles.flowBtn}
        disabled={!hasPrev}
        onClick={handlePrev}
        title={!hasPrev ? 'No incoming connections' : hasMultiplePrev ? 'Choose parent node' : `Go to ${incomingEdges[0]?.from}`}
      >
        ← Prev

        {hasMultiplePrev && showPrevDropdown && (
          <div
            ref={dropdownRef}
            className={styles.prevDropdown}
            onClick={(e) => e.stopPropagation()}
          >
            {incomingEdges.map((edge) => {
              const parentNode = getNode(edge.from)
              return (
                <button
                  key={edge.id}
                  className={styles.prevDropdownItem}
                  onClick={() => {
                    setShowPrevDropdown(false)
                    setActiveNode(edge.from)
                  }}
                >
                  {parentNode ? (parentNode.title || edge.from) : edge.from}
                  {edge.label ? ` (${edge.label})` : ''}
                </button>
              )
            })}
          </div>
        )}
      </button>

      {/* Add Choices */}
      <button
        className={`${styles.flowBtn} ${styles.flowBtnChoices} ${showChoicesForm ? styles.active : ''}`}
        onClick={onToggleChoicesForm}
        title={showChoicesForm ? 'Close choices form' : 'Add choice branches'}
      >
        ± Choices
      </button>

      {/* Next */}
      <button
        className={styles.flowBtn}
        onClick={handleNext}
        title={sequentialEdge ? `Go to ${sequentialEdge.to}` : 'Create next scene'}
      >
        {sequentialEdge ? 'Next →' : 'New →'}
      </button>
    </div>
  )
}
