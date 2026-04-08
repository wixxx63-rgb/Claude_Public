import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Project, StoryNode, Edge, Character, Variable, Asset, VariableEffect, DialogueLine } from '../types/project'
import { emptyProject, emptyNode } from '../types/project'
import { uid, deriveChildId, spreadPositions } from '../utils/ids'

interface ProjectStore {
  project: Project
  filePath: string | null
  isDirty: boolean
  lastSaved: Date | null

  // Project lifecycle
  newProject: () => void
  loadProject: (project: Project, filePath: string | null) => void
  markClean: (filePath: string) => void

  // Node CRUD
  addNode: (partial: Partial<StoryNode> & { id: string; x: number; y: number }) => StoryNode
  updateNode: (id: string, patch: Partial<StoryNode>) => void
  deleteNode: (id: string) => void
  moveNode: (id: string, x: number, y: number) => void

  // Edge CRUD
  addEdge: (from: string, to: string, label?: string, desc?: string) => Edge
  updateEdge: (id: string, patch: Partial<Edge>) => void
  deleteEdge: (id: string) => void

  // Creates a child node + edge. Returns the new node.
  createChildNode: (parentId: string) => StoryNode | null

  // Character CRUD
  addCharacter: (partial: Partial<Character>) => Character
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void

  // Variable CRUD
  addVariable: (partial: Partial<Variable>) => Variable
  updateVariable: (id: string, patch: Partial<Variable>) => void
  deleteVariable: (id: string) => void

  // Asset CRUD
  addAsset: (asset: Asset) => void
  deleteAsset: (id: string) => void

  // Dialogue lines
  updateDialogueLine: (nodeId: string, lineId: string, patch: Partial<DialogueLine>) => void
  addDialogueLine: (nodeId: string, line: DialogueLine) => void
  deleteDialogueLine: (nodeId: string, lineId: string) => void
  reorderDialogueLines: (nodeId: string, lines: DialogueLine[]) => void

  // Node variables (scene entry effects)
  updateNodeVariables: (nodeId: string, effects: VariableEffect[]) => void

  // Derived helpers (not actions — use these in components via getState)
  getNode: (id: string) => StoryNode | undefined
  getEdgesFrom: (id: string) => Edge[]
  getEdgesTo: (id: string) => Edge[]
  getExistingPaths: () => string[]
}

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    project: emptyProject(),
    filePath: null,
    isDirty: false,
    lastSaved: null,

    newProject() {
      set(state => {
        state.project = emptyProject()
        state.filePath = null
        state.isDirty = false
        state.lastSaved = null
      })
    },

    loadProject(project, filePath) {
      set(state => {
        state.project = project
        state.filePath = filePath
        state.isDirty = false
        state.lastSaved = new Date()
      })
    },

    markClean(filePath) {
      set(state => {
        state.isDirty = false
        state.lastSaved = new Date()
        state.filePath = filePath
      })
    },

    addNode(partial) {
      const node = emptyNode(partial)
      set(state => {
        state.project.nodes.push(node)
        state.isDirty = true
      })
      return node
    },

    updateNode(id, patch) {
      set(state => {
        const idx = state.project.nodes.findIndex(n => n.id === id)
        if (idx !== -1) {
          Object.assign(state.project.nodes[idx], patch)
          state.isDirty = true
        }
      })
    },

    deleteNode(id) {
      set(state => {
        state.project.nodes = state.project.nodes.filter(n => n.id !== id)
        state.project.edges = state.project.edges.filter(e => e.from !== id && e.to !== id)
        state.isDirty = true
      })
    },

    moveNode(id, x, y) {
      set(state => {
        const node = state.project.nodes.find(n => n.id === id)
        if (node) {
          node.x = x
          node.y = y
          state.isDirty = true
        }
      })
    },

    addEdge(from, to, label = '', desc = '') {
      const edge: Edge = { id: uid(), from, to, label, desc, isDeath: false }
      set(state => {
        state.project.edges.push(edge)
        state.isDirty = true
      })
      return edge
    },

    updateEdge(id, patch) {
      set(state => {
        const idx = state.project.edges.findIndex(e => e.id === id)
        if (idx !== -1) {
          Object.assign(state.project.edges[idx], patch)
          state.isDirty = true
        }
      })
    },

    deleteEdge(id) {
      set(state => {
        state.project.edges = state.project.edges.filter(e => e.id !== id)
        state.isDirty = true
      })
    },

    createChildNode(parentId) {
      const { project } = get()
      const parent = project.nodes.find(n => n.id === parentId)
      if (!parent) return null

      const existingIds = new Set(project.nodes.map(n => n.id))
      const childId = deriveChildId(parentId, existingIds)
      const [pos] = spreadPositions(parent.x, parent.y, 1)

      const node = get().addNode({ id: childId, x: pos.x, y: pos.y, path: parent.path })
      get().addEdge(parentId, childId)
      return node
    },

    addCharacter(partial) {
      const char: Character = {
        id: uid(),
        name: 'New Character',
        color: '#ffffff',
        sprites: [],
        ...partial
      }
      set(state => {
        state.project.characters.push(char)
        state.isDirty = true
      })
      return char
    },

    updateCharacter(id, patch) {
      set(state => {
        const idx = state.project.characters.findIndex(c => c.id === id)
        if (idx !== -1) {
          Object.assign(state.project.characters[idx], patch)
          state.isDirty = true
        }
      })
    },

    deleteCharacter(id) {
      set(state => {
        state.project.characters = state.project.characters.filter(c => c.id !== id)
        state.isDirty = true
      })
    },

    addVariable(partial) {
      const variable: Variable = {
        id: uid(),
        name: 'new_var',
        type: 'string',
        defaultValue: '',
        ...partial
      }
      set(state => {
        state.project.variables.push(variable)
        state.isDirty = true
      })
      return variable
    },

    updateVariable(id, patch) {
      set(state => {
        const idx = state.project.variables.findIndex(v => v.id === id)
        if (idx !== -1) {
          Object.assign(state.project.variables[idx], patch)
          state.isDirty = true
        }
      })
    },

    deleteVariable(id) {
      set(state => {
        state.project.variables = state.project.variables.filter(v => v.id !== id)
        state.isDirty = true
      })
    },

    addAsset(asset) {
      set(state => {
        state.project.assets.push(asset)
        state.isDirty = true
      })
    },

    deleteAsset(id) {
      set(state => {
        state.project.assets = state.project.assets.filter(a => a.id !== id)
        state.isDirty = true
      })
    },

    updateDialogueLine(nodeId, lineId, patch) {
      set(state => {
        const node = state.project.nodes.find(n => n.id === nodeId)
        if (!node) return
        const line = node.dialogueLines.find(l => l.id === lineId)
        if (line) {
          Object.assign(line, patch)
          state.isDirty = true
        }
      })
    },

    addDialogueLine(nodeId, line) {
      set(state => {
        const node = state.project.nodes.find(n => n.id === nodeId)
        if (node) {
          node.dialogueLines.push(line)
          state.isDirty = true
        }
      })
    },

    deleteDialogueLine(nodeId, lineId) {
      set(state => {
        const node = state.project.nodes.find(n => n.id === nodeId)
        if (node) {
          node.dialogueLines = node.dialogueLines.filter(l => l.id !== lineId)
          state.isDirty = true
        }
      })
    },

    reorderDialogueLines(nodeId, lines) {
      set(state => {
        const node = state.project.nodes.find(n => n.id === nodeId)
        if (node) {
          node.dialogueLines = lines
          state.isDirty = true
        }
      })
    },

    updateNodeVariables(nodeId, effects) {
      set(state => {
        const node = state.project.nodes.find(n => n.id === nodeId)
        if (node) {
          node.variables = effects
          state.isDirty = true
        }
      })
    },

    getNode: (id) => get().project.nodes.find(n => n.id === id),
    getEdgesFrom: (id) => get().project.edges.filter(e => e.from === id),
    getEdgesTo: (id) => get().project.edges.filter(e => e.to === id),
    getExistingPaths: () => {
      const paths = new Set(get().project.nodes.map(n => n.path).filter(Boolean))
      return Array.from(paths).sort()
    }
  }))
)
