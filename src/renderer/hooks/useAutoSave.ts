import { useEffect, useRef } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { IPC } from '../types/ipc'

const AUTO_SAVE_INTERVAL = 30_000

export function useAutoSave(): void {
  const isSaving = useRef(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      const { project, filePath, isDirty } = useProjectStore.getState()
      if (!isDirty || !filePath || isSaving.current) return

      isSaving.current = true
      try {
        const result = await window.electronAPI.invoke(IPC.PROJECT_SAVE, { project, filePath }) as { filePath: string }
        useProjectStore.getState().markClean(result.filePath)
      } catch (err) {
        console.error('Auto-save failed:', err)
      } finally {
        isSaving.current = false
      }
    }, AUTO_SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [])
}
