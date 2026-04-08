import React from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import DialogueLineList from './DialogueLineList'
import ScenePreview from './ScenePreview'
import SceneProperties from './SceneProperties'
import styles from './SceneMode.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface SceneModeProps {
  nodeId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const SceneMode: React.FC<SceneModeProps> = ({ nodeId }) => {
  const node = useProjectStore((s) => s.project.nodes.find((n) => n.id === nodeId))
  const setMode = useUIStore((s) => s.setMode)

  if (!node) {
    return (
      <div className={styles.errorState}>
        <p>Node &quot;{nodeId}&quot; not found.</p>
        <button onClick={() => setMode('graph')}>Back to Graph</button>
      </div>
    )
  }

  return (
    <div className={styles.sceneMode}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.nodeId}>{node.id}</span>
          <span className={styles.nodeSep}>/</span>
          <span className={styles.nodeTitle}>{node.title}</span>
        </div>
        <button
          className={styles.backBtn}
          onClick={() => setMode('graph')}
        >
          ← Back to Graph
        </button>
      </div>

      {/* 3-Column Layout */}
      <div className={styles.columns}>
        <div className={styles.leftCol}>
          <DialogueLineList nodeId={nodeId} />
        </div>
        <div className={styles.centerCol}>
          <ScenePreview nodeId={nodeId} />
        </div>
        <div className={styles.rightCol}>
          <SceneProperties nodeId={nodeId} />
        </div>
      </div>
    </div>
  )
}

export default SceneMode
