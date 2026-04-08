import { useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { IPC } from '../types/ipc'
import { useMenuEvent } from './useIpc'

export function useKeyboardShortcuts(): void {
  // Undo/Redo via keyboard (Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        triggerUndo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        triggerRedo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Menu undo/redo from main process
  useMenuEvent(IPC.MENU_UNDO, triggerUndo)
  useMenuEvent(IPC.MENU_REDO, triggerRedo)
}

function triggerUndo(): void {
  const history = useHistoryStore.getState()
  if (!history.canUndo) return
  const current = useProjectStore.getState().project
  history.undo((p) => useProjectStore.getState().loadProject(p, useProjectStore.getState().filePath), current)
}

function triggerRedo(): void {
  const history = useHistoryStore.getState()
  if (!history.canRedo) return
  const current = useProjectStore.getState().project
  history.redo((p) => useProjectStore.getState().loadProject(p, useProjectStore.getState().filePath), current)
}

/** Call this before any project mutation that should be undoable. */
export function recordSnapshot(): void {
  const project = useProjectStore.getState().project
  useHistoryStore.getState().snapshot(project)
}
