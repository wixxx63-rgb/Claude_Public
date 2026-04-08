import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Project } from '../types/project'

const MAX_HISTORY = 50

interface HistoryStore {
  past: Project[]
  future: Project[]
  canUndo: boolean
  canRedo: boolean

  /** Call BEFORE applying a mutation to projectStore. */
  snapshot: (current: Project) => void
  /** Apply the previous state via the provided setter. */
  undo: (apply: (p: Project) => void, current: Project) => void
  /** Re-apply the next state via the provided setter. */
  redo: (apply: (p: Project) => void, current: Project) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryStore>()(
  immer((set, get) => ({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    snapshot(current) {
      set(state => {
        state.past.push(JSON.parse(JSON.stringify(current)))
        if (state.past.length > MAX_HISTORY) state.past.shift()
        state.future = []
        state.canUndo = true
        state.canRedo = false
      })
    },

    undo(apply, current) {
      const { past } = get()
      if (past.length === 0) return
      const prev = past[past.length - 1]
      apply(JSON.parse(JSON.stringify(prev)))
      set(state => {
        state.future.unshift(JSON.parse(JSON.stringify(current)))
        if (state.future.length > MAX_HISTORY) state.future.pop()
        state.past.pop()
        state.canUndo = state.past.length > 0
        state.canRedo = true
      })
    },

    redo(apply, current) {
      const { future } = get()
      if (future.length === 0) return
      const next = future[0]
      apply(JSON.parse(JSON.stringify(next)))
      set(state => {
        state.past.push(JSON.parse(JSON.stringify(current)))
        if (state.past.length > MAX_HISTORY) state.past.shift()
        state.future.shift()
        state.canUndo = true
        state.canRedo = state.future.length > 0
      })
    },

    clear() {
      set(state => {
        state.past = []
        state.future = []
        state.canUndo = false
        state.canRedo = false
      })
    }
  }))
)
