import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type AppMode = 'graph' | 'scene' | 'play'
export type ModalType = 'characters' | 'variables' | null

interface UIStore {
  mode: AppMode
  activeNodeId: string | null
  panelOpen: boolean
  navigationHistory: string[]    // breadcrumb stack (session)
  sceneNodeId: string | null     // which node is open in scene mode
  playStartNodeId: string | null // which node play started from

  // Canvas state (kept in store so Minimap + Sidebar can read it)
  zoom: number
  stageX: number
  stageY: number

  // Link mode
  linkMode: boolean
  linkDragSource: string | null

  // Search
  searchQuery: string

  // Modals
  modalOpen: ModalType

  // Active dialogue line in scene mode
  activeLineId: string | null

  // Actions
  setMode: (mode: AppMode) => void
  /** Single choke-point for all node navigation. Pushes breadcrumb, opens panel. */
  setActiveNode: (id: string | null) => void
  closePanel: () => void
  openSceneMode: (nodeId: string) => void
  startPlay: (startNodeId: string) => void
  exitPlay: () => void

  setZoom: (z: number) => void
  setStageOffset: (x: number, y: number) => void
  toggleLinkMode: () => void
  setLinkDragSource: (id: string | null) => void

  setSearch: (q: string) => void
  openModal: (modal: Exclude<ModalType, null>) => void
  closeModal: () => void

  setActiveLineId: (id: string | null) => void
}

export const useUIStore = create<UIStore>()(
  immer((set) => ({
    mode: 'graph',
    activeNodeId: null,
    panelOpen: false,
    navigationHistory: [],
    sceneNodeId: null,
    playStartNodeId: null,
    zoom: 1,
    stageX: 0,
    stageY: 0,
    linkMode: false,
    linkDragSource: null,
    searchQuery: '',
    modalOpen: null,
    activeLineId: null,

    setMode(mode) {
      set(state => { state.mode = mode })
    },

    setActiveNode(id) {
      set(state => {
        if (id === null) {
          state.activeNodeId = null
          state.panelOpen = false
          return
        }
        // Push to breadcrumb only if different from current
        if (state.activeNodeId !== id) {
          if (state.activeNodeId) {
            state.navigationHistory.push(state.activeNodeId)
            // Keep history to last 20 entries
            if (state.navigationHistory.length > 20) {
              state.navigationHistory.shift()
            }
          }
        }
        state.activeNodeId = id
        state.panelOpen = true
      })
    },

    closePanel() {
      set(state => {
        state.panelOpen = false
        state.activeNodeId = null
      })
    },

    openSceneMode(nodeId) {
      set(state => {
        state.sceneNodeId = nodeId
        state.mode = 'scene'
        state.activeLineId = null
      })
    },

    startPlay(startNodeId) {
      set(state => {
        state.playStartNodeId = startNodeId
        state.mode = 'play'
      })
    },

    exitPlay() {
      set(state => {
        state.mode = state.sceneNodeId ? 'scene' : 'graph'
        state.playStartNodeId = null
      })
    },

    setZoom(z) {
      set(state => { state.zoom = z })
    },

    setStageOffset(x, y) {
      set(state => {
        state.stageX = x
        state.stageY = y
      })
    },

    toggleLinkMode() {
      set(state => {
        state.linkMode = !state.linkMode
        state.linkDragSource = null
      })
    },

    setLinkDragSource(id) {
      set(state => { state.linkDragSource = id })
    },

    setSearch(q) {
      set(state => { state.searchQuery = q })
    },

    openModal(modal) {
      set(state => { state.modalOpen = modal })
    },

    closeModal() {
      set(state => { state.modalOpen = null })
    },

    setActiveLineId(id) {
      set(state => { state.activeLineId = id })
    }
  }))
)
