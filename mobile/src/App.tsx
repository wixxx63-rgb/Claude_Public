import React, { useState } from 'react'
import type { Project } from './types'
import LoadScreen from './screens/LoadScreen'
import PlayerScreen from './screens/PlayerScreen'

export type Screen = 'load' | 'play'

export default function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [startNodeId, setStartNodeId] = useState<string | null>(null)

  function handleProjectLoaded(p: Project) {
    setProject(p)
    // Find root node (no incoming edges)
    const toSet = new Set(p.edges.map(e => e.to))
    const root = p.nodes.find(n => !toSet.has(n.id))
    setStartNodeId(root?.id ?? p.nodes[0]?.id ?? null)
  }

  if (project && startNodeId) {
    return (
      <PlayerScreen
        project={project}
        startNodeId={startNodeId}
        onExit={() => { setProject(null); setStartNodeId(null) }}
      />
    )
  }

  return <LoadScreen onLoad={handleProjectLoaded} />
}
