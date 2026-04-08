import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import styles from './Toolbar.module.css'

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  return `${diffHr}h ago`
}

const SaveIndicator: React.FC = () => {
  const isDirty = useProjectStore((s) => s.isDirty)
  const lastSaved = useProjectStore((s) => s.lastSaved)
  const filePath = useProjectStore((s) => s.filePath)

  // Tick every 30s to keep "Xm ago" fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  if (!filePath) {
    return <span className={styles.saveIndicator}>Unsaved project</span>
  }

  if (isDirty) {
    return (
      <span className={`${styles.saveIndicator} ${styles.saveIndicatorDirty}`}>
        <span className={styles.saveDot} aria-hidden="true">●</span>
        Unsaved changes
      </span>
    )
  }

  if (lastSaved) {
    return (
      <span className={styles.saveIndicator}>
        Saved · {formatTimeAgo(lastSaved)}
      </span>
    )
  }

  return <span className={styles.saveIndicator}>Saved</span>
}

export default SaveIndicator
