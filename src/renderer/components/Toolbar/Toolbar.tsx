import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import { IPC } from '../../types/ipc'
import { computeAutoLayout } from '../../utils/autoLayout'
import { recordSnapshot } from '../../hooks/useKeyboardShortcuts'
import { uid } from '../../utils/ids'
import { useMenuEvent } from '../../hooks/useIpc'
import SaveIndicator from './SaveIndicator'
import styles from './Toolbar.module.css'

// ─── Helper: auto-node ID ────────────────────────────────────────────────────

function nextNodeId(nodes: { id: string }[]): string {
  // Find the highest numeric suffix among IDs like "N1", "N2" …
  let max = 0
  for (const n of nodes) {
    const m = n.id.match(/^N(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `N${max + 1}`
}

// ─── Component ────────────────────────────────────────────────────────────────

const Toolbar: React.FC = () => {
  // ── Store selectors ──────────────────────────────────────────────────────
  const project = useProjectStore((s) => s.project)
  const filePath = useProjectStore((s) => s.filePath)
  const addNode = useProjectStore((s) => s.addNode)
  const moveNode = useProjectStore((s) => s.moveNode)
  const newProject = useProjectStore((s) => s.newProject)
  const loadProject = useProjectStore((s) => s.loadProject)
  const markClean = useProjectStore((s) => s.markClean)

  const mode = useUIStore((s) => s.mode)
  const linkMode = useUIStore((s) => s.linkMode)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const sceneNodeId = useUIStore((s) => s.sceneNodeId)
  const setMode = useUIStore((s) => s.setMode)
  const toggleLinkMode = useUIStore((s) => s.toggleLinkMode)
  const openModal = useUIStore((s) => s.openModal)
  const setSearch = useUIStore((s) => s.setSearch)
  const exitPlay = useUIStore((s) => s.exitPlay)

  // ── Local state ──────────────────────────────────────────────────────────
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const importMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close import submenu on outside click
  useEffect(() => {
    if (!importMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [importMenuOpen])

  // ── Add node ─────────────────────────────────────────────────────────────

  const handleAddNode = useCallback(() => {
    recordSnapshot()
    const id = nextNodeId(project.nodes)
    // Offset each new node slightly so they don't stack
    const offset = (project.nodes.length % 10) * 20
    addNode({ id, x: 100 + offset, y: 100 + offset })
  }, [project.nodes, addNode])

  // ── Auto layout ──────────────────────────────────────────────────────────

  const handleAutoLayout = useCallback(() => {
    const results = computeAutoLayout(project.nodes, project.edges)
    recordSnapshot()
    const startPositions = new Map(project.nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
    const start = Date.now()

    function tick() {
      const t = Math.min((Date.now() - start) / 400, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      for (const r of results) {
        const from = startPositions.get(r.id)
        if (!from) continue
        moveNode(r.id, from.x + (r.x - from.x) * ease, from.y + (r.y - from.y) * ease)
      }
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [project.nodes, project.edges, moveNode])

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExportJSON = useCallback(async () => {
    await window.electronAPI.invoke(IPC.PROJECT_EXPORT_JSON, { project })
  }, [project])

  const handleExportXML = useCallback(async () => {
    await window.electronAPI.invoke(IPC.PROJECT_EXPORT_XML, { project })
  }, [project])

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImportJSON = useCallback(async () => {
    setImportMenuOpen(false)
    const result = await window.electronAPI.invoke(IPC.PROJECT_IMPORT_JSON)
    if (result) {
      recordSnapshot()
      loadProject(result.project, result.filePath)
    }
  }, [loadProject])

  const handleImportXML = useCallback(async () => {
    setImportMenuOpen(false)
    const result = await window.electronAPI.invoke(IPC.PROJECT_IMPORT_XML)
    if (result) {
      recordSnapshot()
      loadProject(result.project, result.filePath)
    }
  }, [loadProject])

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const currentFilePath = useProjectStore.getState().filePath
    const currentProject = useProjectStore.getState().project
    if (currentFilePath) {
      const result = await window.electronAPI.invoke(IPC.PROJECT_SAVE, {
        project: currentProject,
        filePath: currentFilePath,
      })
      markClean(result.filePath)
    } else {
      const result = await window.electronAPI.invoke(IPC.PROJECT_SAVE_AS, { project: currentProject })
      if (result) markClean(result.filePath)
    }
  }, [markClean])

  const handleSaveAs = useCallback(async () => {
    const currentProject = useProjectStore.getState().project
    const result = await window.electronAPI.invoke(IPC.PROJECT_SAVE_AS, { project: currentProject })
    if (result) markClean(result.filePath)
  }, [markClean])

  // ── New / Open ───────────────────────────────────────────────────────────

  const handleNew = useCallback(async () => {
    const { isDirty } = useProjectStore.getState()
    if (isDirty) {
      const res = await window.electronAPI.invoke(IPC.DIALOG_CONFIRM, {
        message: 'Discard unsaved changes?',
        detail: 'Any unsaved work in the current project will be lost.',
      })
      if (!res?.confirmed) return
    }
    newProject()
  }, [newProject])

  const handleOpen = useCallback(async () => {
    const result = await window.electronAPI.invoke(IPC.PROJECT_OPEN)
    if (result) {
      loadProject(result.project, result.filePath)
    }
  }, [loadProject])

  // ── Menu events from main process ─────────────────────────────────────────

  useMenuEvent(IPC.MENU_NEW, handleNew)
  useMenuEvent(IPC.MENU_OPEN, handleOpen)
  useMenuEvent(IPC.MENU_SAVE, handleSave)
  useMenuEvent(IPC.MENU_SAVE_AS, handleSaveAs)

  // ── Mode indicator text ───────────────────────────────────────────────────

  const modeLabel =
    mode === 'graph'
      ? 'Graph'
      : mode === 'scene'
      ? `Scene: ${sceneNodeId ?? ''}`
      : 'Playing'

  const showBackButton = mode === 'scene' || mode === 'play'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <header className={styles.toolbar}>
      {/* ── Left ────────────────────────────────────────────────────────── */}
      <div className={styles.left}>
        <span className={styles.appName}>Narrative Flow</span>
        <span className={styles.modeLabel}>{modeLabel}</span>
        {showBackButton && (
          <button
            className={styles.btnBack}
            onClick={() => (mode === 'play' ? exitPlay() : setMode('graph'))}
            title="Back to Graph"
          >
            ← Graph
          </button>
        )}
      </div>

      {/* ── Center (graph mode only) ─────────────────────────────────────── */}
      {mode === 'graph' && (
        <div className={styles.center}>
          <button className={styles.btn} onClick={handleAddNode} title="Add Node">
            + Node
          </button>

          <button
            className={`${styles.btn} ${linkMode ? styles.btnActive : ''}`}
            onClick={toggleLinkMode}
            title="Toggle Link Mode"
          >
            Link {linkMode ? 'ON' : 'OFF'}
          </button>

          <button className={styles.btn} onClick={handleAutoLayout} title="Auto Layout">
            Auto Layout
          </button>

          <button
            className={styles.btn}
            onClick={() => openModal('characters')}
            title="Character Manager"
          >
            Characters
          </button>

          <button
            className={styles.btn}
            onClick={() => openModal('variables')}
            title="Variable Manager"
          >
            Variables
          </button>
        </div>
      )}

      {/* ── Right ───────────────────────────────────────────────────────── */}
      <div className={styles.right}>
        <input
          ref={searchInputRef}
          className={styles.searchInput}
          type="search"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search nodes"
        />

        <button className={styles.btn} onClick={handleExportJSON} title="Export JSON">
          Export JSON
        </button>

        <button className={styles.btn} onClick={handleExportXML} title="Export XML">
          Export XML
        </button>

        <div className={styles.importWrap} ref={importMenuRef}>
          <button
            className={styles.btn}
            onClick={() => setImportMenuOpen((v) => !v)}
            title="Import"
          >
            Import ▾
          </button>
          {importMenuOpen && (
            <div className={styles.importMenu}>
              <button className={styles.importMenuItem} onClick={handleImportJSON}>
                Import JSON
              </button>
              <button className={styles.importMenuItem} onClick={handleImportXML}>
                Import XML
              </button>
            </div>
          )}
        </div>

        <SaveIndicator />

        <button className={styles.btnIcon} title="Settings (coming soon)" aria-label="Settings">
          ⚙
        </button>
      </div>
    </header>
  )
}

export default Toolbar
