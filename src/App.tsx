import React, { useState } from 'react'
import { useStore } from './store'
import Toolbar from './components/Toolbar'
import GraphCanvas from './components/GraphMode/GraphCanvas'
import DetailPanel from './components/GraphMode/DetailPanel'
import NodeList from './components/NodeList'
import SceneEditor from './components/SceneMode/SceneEditor'
import PlayEngine from './components/PlayMode/PlayEngine'

export default function App() {
  const { mode, selectedNodeId } = useStore(s => ({
    mode: s.mode,
    selectedNodeId: s.selectedNodeId
  }))
  const [nodeListCollapsed, setNodeListCollapsed] = useState(false)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#0f1117'
    }}>
      {/* Toolbar — always visible */}
      <Toolbar />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Node list sidebar (graph mode only) */}
        {mode === 'graph' && (
          <NodeList
            collapsed={nodeListCollapsed}
            onToggle={() => setNodeListCollapsed(v => !v)}
          />
        )}

        {/* Graph canvas */}
        {mode === 'graph' && (
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <GraphCanvas />
            {/* Detail panel slides in from right */}
            {selectedNodeId && <DetailPanel />}
          </div>
        )}

        {/* Scene editor */}
        {mode === 'scene' && <SceneEditor />}
      </div>

      {/* Play mode overlays everything */}
      {mode === 'play' && <PlayEngine />}
    </div>
  )
}
