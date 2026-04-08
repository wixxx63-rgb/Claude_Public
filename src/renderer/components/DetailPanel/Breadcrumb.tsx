import React, { useRef } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { useProjectStore } from '../../store/useProjectStore'
import styles from './DetailPanel.module.css'

const MAX_VISIBLE = 5

export function Breadcrumb(): React.ReactElement | null {
  const navigationHistory = useUIStore((s) => s.navigationHistory)
  const activeNodeId = useUIStore((s) => s.activeNodeId)
  const setActiveNode = useUIStore((s) => s.setActiveNode)
  const getNode = useProjectStore((s) => s.getNode)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  // Build chip list: history items + current node
  const historyChips = navigationHistory.slice(-MAX_VISIBLE - 1) // keep a window
  const allChips = activeNodeId ? [...historyChips, activeNodeId] : historyChips

  if (allChips.length <= 1 && !activeNodeId) return null

  // Determine if we need to collapse older items
  const needsEllipsis = navigationHistory.length > MAX_VISIBLE
  const visibleHistory = navigationHistory.slice(-(MAX_VISIBLE - 1))
  const hiddenHistory = navigationHistory.slice(0, navigationHistory.length - (MAX_VISIBLE - 1))

  const visibleChips: string[] = activeNodeId
    ? [...visibleHistory, activeNodeId]
    : visibleHistory

  const getLabel = (id: string) => {
    const node = getNode(id)
    return node ? (node.title || id) : id
  }

  return (
    <div className={styles.breadcrumb} role="navigation" aria-label="Navigation history">
      {needsEllipsis && (
        <>
          <span
            className={styles.breadcrumbEllipsis}
            title={hiddenHistory.map(getLabel).join(' → ')}
          >
            …
          </span>
          <span className={styles.breadcrumbSep}>→</span>
        </>
      )}

      {visibleChips.map((id, idx) => {
        const isCurrent = id === activeNodeId && idx === visibleChips.length - 1
        const label = getLabel(id)

        return (
          <React.Fragment key={`${id}-${idx}`}>
            {idx > 0 && <span className={styles.breadcrumbSep}>→</span>}
            {isCurrent ? (
              <span className={`${styles.breadcrumbChip} ${styles.current}`} aria-current="page">
                {label}
              </span>
            ) : (
              <button
                className={styles.breadcrumbChip}
                onClick={() => setActiveNode(id)}
                title={id}
              >
                {label}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
