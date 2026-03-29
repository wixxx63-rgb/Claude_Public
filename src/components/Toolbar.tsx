import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import { exportJSON, exportXML, importJSON, importXML } from '../utils/exportImport'
import { v4 as uuidv4 } from 'uuid'
import type { Project } from '../types'
import CharacterManager from './CharacterManager'
import VariableManager from './VariableManager'

export default function Toolbar() {
  const {
    mode, project, isDirty, linkModeActive, sceneNodeId, undoStack, redoStack
  } = useStore(s => ({
    mode: s.mode,
    project: s.project,
    isDirty: s.isDirty,
    linkModeActive: s.linkModeActive,
    sceneNodeId: s.sceneNodeId,
    undoStack: s.undoStack,
    redoStack: s.redoStack
  }))

  const setMode = useStore(s => s.setMode)
  const setLinkMode = useStore(s => s.setLinkMode)
  const setSearchQuery = useStore(s => s.setSearchQuery)
  const createNodeAt = useStore(s => s.createNodeAt)
  const navigateTo = useStore(s => s.navigateTo)
  const loadProject = useStore(s => s.loadProject)
  const markSaved = useStore(s => s.markSaved)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)

  const [showCharManager, setShowCharManager] = useState(false)
  const [showVarManager, setShowVarManager] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [searchVal, setSearchVal] = useState('')

  // Update save indicator
  useEffect(() => {
    if (!isDirty && project.lastSaved) {
      const mins = Math.round((Date.now() - project.lastSaved) / 60000)
      setSaveMsg(mins < 1 ? 'Saved · Just now' : `Saved · ${mins}m ago`)
    } else if (isDirty) {
      setSaveMsg('● Unsaved changes')
    }
  }, [isDirty, project.lastSaved])

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, project])

  async function handleSave() {
    let path = project.projectPath
    if (!path) {
      path = await window.electronAPI?.saveFile(
        [{ name: 'Narrative Flow', extensions: ['nflow'] }],
        `${project.name}.nflow`
      )
      if (!path) return
    }
    const data = exportJSON(project)
    const ok = await window.electronAPI?.writeFile(path, data)
    if (ok) markSaved(path)
  }

  async function handleExportJSON() {
    const path = await window.electronAPI?.saveFile(
      [{ name: 'JSON', extensions: ['json'] }],
      `${project.name}.json`
    )
    if (!path) return
    const ok = await window.electronAPI?.writeFile(path, exportJSON(project))
    if (ok) alert('Exported successfully.')
  }

  async function handleExportXML() {
    const path = await window.electronAPI?.saveFile(
      [{ name: 'XML', extensions: ['xml'] }],
      `${project.name}.xml`
    )
    if (!path) return
    const ok = await window.electronAPI?.writeFile(path, exportXML(project))
    if (ok) alert('Exported successfully.')
  }

  async function handleImport() {
    const filePath = await window.electronAPI?.openFile([
      { name: 'Story Files', extensions: ['json', 'xml', 'nflow'] }
    ])
    if (!filePath) return
    const content = await window.electronAPI?.readFile(filePath)
    if (!content) { alert('Could not read file.'); return }

    if (!confirm('Import will replace the current project. Continue?')) return

    const isXML = filePath.endsWith('.xml')
    const data = isXML ? importXML(content) : importJSON(content)
    if (!data) { alert('Invalid file format.'); return }

    const newProject: Project = {
      id: uuidv4(),
      name: data.name ?? 'Imported Story',
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      characters: data.characters ?? [],
      variables: data.variables ?? [],
      assets: data.assets ?? [],
      projectPath: filePath.endsWith('.nflow') ? filePath : null,
      lastSaved: null
    }
    loadProject(newProject)
  }

  function handleAddNode() {
    const node = createNodeAt(0, 0)
    navigateTo(node.id)
  }

  const sceneNode = mode === 'scene' && sceneNodeId
    ? project.nodes.find(n => n.id === sceneNodeId)
    : null

  return (
    <>
      <div style={{
        height: 'var(--toolbar-height)',
        background: '#161b27',
        borderBottom: '1px solid #2a3448',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        zIndex: 20,
        position: 'relative',
        flexShrink: 0
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#e8ecf4', letterSpacing: '-0.02em', flexShrink: 0 }}>
            Narrative Flow
          </span>

          <div style={{
            width: 1, height: 20,
            background: '#2a3448',
            flexShrink: 0
          }} />

          {/* Mode indicator */}
          <span style={{ fontSize: 12, color: '#9aa5bb', flexShrink: 0 }}>
            {mode === 'graph' && 'Graph'}
            {mode === 'scene' && `Scene: ${sceneNode?.id ?? sceneNodeId}`}
            {mode === 'play' && 'Playing'}
          </span>

          {/* Back to graph */}
          {(mode === 'scene' || mode === 'play') && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '3px 10px', flexShrink: 0 }}
              onClick={() => setMode('graph')}
            >◀ Graph</button>
          )}
        </div>

        {/* Centre (graph mode only) */}
        {mode === 'graph' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={handleAddNode}>+ Node</button>

            <button
              className="btn"
              style={{
                fontSize: 12, padding: '4px 10px',
                background: linkModeActive ? '#302000' : 'transparent',
                border: `1px solid ${linkModeActive ? '#d4a040' : '#2a3448'}`,
                color: linkModeActive ? '#d4a040' : '#9aa5bb'
              }}
              onClick={() => setLinkMode(!linkModeActive)}
            >
              {linkModeActive ? '🔗 Link ON' : '🔗 Link'}
            </button>

            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => window.dispatchEvent(new Event('narrative:autoLayout'))}>
              Auto layout
            </button>

            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setShowCharManager(true)}>Characters</button>

            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setShowVarManager(true)}>Variables</button>

            {/* Search */}
            <input
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); setSearchQuery(e.target.value) }}
              placeholder="Search…"
              style={{ width: 140, fontSize: 12, padding: '4px 10px' }}
            />
          </div>
        )}

        {/* Spacer for non-graph modes */}
        {mode !== 'graph' && <div style={{ flex: 1 }} />}

        {/* Undo/redo */}
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '4px 8px' }}
          disabled={!undoStack.length}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >↩</button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '4px 8px' }}
          disabled={!redoStack.length}
          onClick={redo}
          title="Redo (Ctrl+Y)"
        >↪</button>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={handleExportJSON}>JSON</button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={handleExportXML}>XML</button>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={handleImport}>Import</button>

          <div style={{ width: 1, height: 16, background: '#2a3448' }} />

          <span style={{
            fontSize: 11,
            color: isDirty ? '#d4a040' : '#5e6e8a',
            minWidth: 120,
            textAlign: 'right'
          }}>{saveMsg || (isDirty ? '● Unsaved' : 'No changes')}</span>

          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '4px 12px' }}
            onClick={handleSave}
          >Save</button>
        </div>
      </div>

      {showCharManager && <CharacterManager onClose={() => setShowCharManager(false)} />}
      {showVarManager && <VariableManager onClose={() => setShowVarManager(false)} />}
    </>
  )
}
