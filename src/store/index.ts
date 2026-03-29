import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  Project,
  StoryNode,
  Edge,
  Character,
  Variable,
  Asset,
  AppMode,
  CanvasTransform,
  UndoAction,
  Branch,
  DialogueLine,
  VariableEffect,
  NodeType
} from '../types'

const DEFAULT_PROJECT: Project = {
  id: uuidv4(),
  name: 'Untitled Story',
  nodes: [],
  edges: [],
  characters: [],
  variables: [],
  assets: [],
  projectPath: null,
  lastSaved: null
}

interface AppState {
  // Project data
  project: Project
  isDirty: boolean

  // App mode
  mode: AppMode
  sceneNodeId: string | null  // which node is open in scene mode
  playFromNodeId: string | null

  // Graph UI state
  selectedNodeId: string | null
  canvasTransform: CanvasTransform
  linkModeActive: boolean
  panelNavHistory: string[]  // session navigation history of node IDs
  searchQuery: string

  // Undo/redo stacks
  undoStack: UndoAction[]
  redoStack: UndoAction[]

  // Auto-save timer
  autoSaveTimer: ReturnType<typeof setTimeout> | null

  // ── Setters ───────────────────────────────────────────────────────────

  setMode: (mode: AppMode, nodeId?: string) => void
  setSelectedNode: (id: string | null) => void
  setCanvasTransform: (t: CanvasTransform) => void
  setLinkMode: (active: boolean) => void
  setSearchQuery: (q: string) => void

  // ── Project operations ────────────────────────────────────────────────

  loadProject: (p: Project) => void
  setProjectName: (name: string) => void

  // ── Node operations ───────────────────────────────────────────────────

  addNode: (node: StoryNode) => void
  updateNode: (id: string, changes: Partial<StoryNode>) => void
  deleteNode: (id: string) => void
  moveNode: (id: string, x: number, y: number) => void
  createNodeAt: (x: number, y: number, type?: NodeType) => StoryNode
  duplicateNode: (id: string) => StoryNode | null

  // ── Edge operations ───────────────────────────────────────────────────

  addEdge: (edge: Edge) => void
  updateEdge: (id: string, changes: Partial<Edge>) => void
  deleteEdge: (id: string) => void
  deleteEdgesForNode: (nodeId: string) => void

  // ── Character operations ──────────────────────────────────────────────

  addCharacter: (character: Character) => void
  updateCharacter: (id: string, changes: Partial<Character>) => void
  deleteCharacter: (id: string) => void

  // ── Variable operations ───────────────────────────────────────────────

  addVariable: (variable: Variable) => void
  updateVariable: (id: string, changes: Partial<Variable>) => void
  deleteVariable: (id: string) => void

  // ── Asset operations ──────────────────────────────────────────────────

  addAsset: (asset: Asset) => void
  deleteAsset: (id: string) => void

  // ── Branch helpers ────────────────────────────────────────────────────

  updateBranches: (nodeId: string, branches: Branch[]) => void

  // ── Dialogue line helpers ─────────────────────────────────────────────

  updateDialogueLines: (nodeId: string, lines: DialogueLine[]) => void
  addDialogueLine: (nodeId: string) => void

  // ── Variable effects helpers ──────────────────────────────────────────

  updateVariableEffects: (nodeId: string, effects: VariableEffect[]) => void

  // ── Undo/Redo ─────────────────────────────────────────────────────────

  undo: () => void
  redo: () => void
  snapshotForUndo: (type: UndoAction['type']) => void

  // ── Panel navigation ──────────────────────────────────────────────────

  navigateTo: (nodeId: string) => void

  // ── Save ──────────────────────────────────────────────────────────────

  markSaved: (path?: string) => void
  markDirty: () => void
}

function getAutoId(nodes: StoryNode[], baseId?: string): string {
  if (baseId) {
    const nums = nodes
      .map(n => n.id)
      .filter(id => id.startsWith(baseId + '-'))
      .map(id => parseInt(id.slice(baseId.length + 1), 10))
      .filter(n => !isNaN(n))
    const next = nums.length ? Math.max(...nums) + 1 : 1
    return `${baseId}-${next}`
  }
  // Generate sequential ID from existing IDs
  const existing = nodes.map(n => n.id).filter(id => /^S\d+$/.test(id)).map(id => parseInt(id.slice(1)))
  const next = existing.length ? Math.max(...existing) + 1 : 1
  return `S${next}`
}

export const useStore = create<AppState>((set, get) => ({
  project: DEFAULT_PROJECT,
  isDirty: false,
  mode: 'graph',
  sceneNodeId: null,
  playFromNodeId: null,
  selectedNodeId: null,
  canvasTransform: { x: 0, y: 0, scale: 1 },
  linkModeActive: false,
  panelNavHistory: [],
  searchQuery: '',
  undoStack: [],
  redoStack: [],
  autoSaveTimer: null,

  setMode: (mode, nodeId) => set(s => ({
    mode,
    sceneNodeId: mode === 'scene' ? (nodeId ?? s.sceneNodeId) : s.sceneNodeId,
    playFromNodeId: mode === 'play' ? (nodeId ?? s.playFromNodeId) : s.playFromNodeId
  })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  setCanvasTransform: (t) => set({ canvasTransform: t }),

  setLinkMode: (active) => set({ linkModeActive: active }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  loadProject: (p) => set({
    project: p,
    isDirty: false,
    selectedNodeId: null,
    mode: 'graph',
    sceneNodeId: null,
    panelNavHistory: [],
    undoStack: [],
    redoStack: []
  }),

  setProjectName: (name) => {
    get().snapshotForUndo('field_edited')
    set(s => ({ project: { ...s.project, name }, isDirty: true }))
  },

  // ── Node ops ──────────────────────────────────────────────────────────

  addNode: (node) => {
    get().snapshotForUndo('node_created')
    set(s => ({
      project: { ...s.project, nodes: [...s.project.nodes, node] },
      isDirty: true
    }))
  },

  updateNode: (id, changes) => {
    set(s => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map(n => n.id === id ? { ...n, ...changes } : n)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  deleteNode: (id) => {
    const { project, selectedNodeId } = get()
    get().snapshotForUndo('node_deleted')
    const edges = project.edges.filter(e => e.from !== id && e.to !== id)
    set(s => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.filter(n => n.id !== id),
        edges
      },
      isDirty: true,
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId
    }))
    scheduleAutoSave(get)
  },

  moveNode: (id, x, y) => {
    set(s => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map(n => n.id === id ? { ...n, x, y } : n)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  createNodeAt: (x, y, type = 'scene') => {
    const { project } = get()
    const id = getAutoId(project.nodes)
    const node: StoryNode = {
      id,
      title: 'New Scene',
      type,
      status: 'todo',
      day: null,
      block: null,
      path: '',
      x,
      y,
      summary: '',
      trigger: '',
      chars: [],
      branches: [],
      dialogue: '',
      grokHandoff: '',
      consequences: '',
      background: null,
      music: null,
      sfx: null,
      transition: 'fade',
      dialogueLines: [],
      variables: []
    }
    get().addNode(node)
    return node
  },

  duplicateNode: (id) => {
    const { project } = get()
    const original = project.nodes.find(n => n.id === id)
    if (!original) return null
    const newId = getAutoId(project.nodes, id)
    const node: StoryNode = {
      ...original,
      id: newId,
      x: original.x + 40,
      y: original.y + 40,
      dialogueLines: original.dialogueLines.map(l => ({ ...l, id: uuidv4() })),
      branches: original.branches.map(b => ({ ...b }))
    }
    get().addNode(node)
    return node
  },

  // ── Edge ops ──────────────────────────────────────────────────────────

  addEdge: (edge) => {
    get().snapshotForUndo('edge_created')
    set(s => ({
      project: { ...s.project, edges: [...s.project.edges, edge] },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  updateEdge: (id, changes) => {
    set(s => ({
      project: {
        ...s.project,
        edges: s.project.edges.map(e => e.id === id ? { ...e, ...changes } : e)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  deleteEdge: (id) => {
    get().snapshotForUndo('edge_deleted')
    set(s => ({
      project: {
        ...s.project,
        edges: s.project.edges.filter(e => e.id !== id)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  deleteEdgesForNode: (nodeId) => {
    set(s => ({
      project: {
        ...s.project,
        edges: s.project.edges.filter(e => e.from !== nodeId && e.to !== nodeId)
      },
      isDirty: true
    }))
  },

  // ── Character ops ──────────────────────────────────────────────────────

  addCharacter: (character) => {
    set(s => ({
      project: { ...s.project, characters: [...s.project.characters, character] },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  updateCharacter: (id, changes) => {
    set(s => ({
      project: {
        ...s.project,
        characters: s.project.characters.map(c => c.id === id ? { ...c, ...changes } : c)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  deleteCharacter: (id) => {
    set(s => ({
      project: {
        ...s.project,
        characters: s.project.characters.filter(c => c.id !== id)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  // ── Variable ops ──────────────────────────────────────────────────────

  addVariable: (variable) => {
    set(s => ({
      project: { ...s.project, variables: [...s.project.variables, variable] },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  updateVariable: (id, changes) => {
    set(s => ({
      project: {
        ...s.project,
        variables: s.project.variables.map(v => v.id === id ? { ...v, ...changes } : v)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  deleteVariable: (id) => {
    set(s => ({
      project: {
        ...s.project,
        variables: s.project.variables.filter(v => v.id !== id)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  // ── Asset ops ──────────────────────────────────────────────────────────

  addAsset: (asset) => {
    set(s => ({
      project: { ...s.project, assets: [...s.project.assets, asset] },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  deleteAsset: (id) => {
    set(s => ({
      project: { ...s.project, assets: s.project.assets.filter(a => a.id !== id) },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  // ── Branch helpers ─────────────────────────────────────────────────────

  updateBranches: (nodeId, branches) => {
    set(s => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, branches } : n)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  // ── Dialogue helpers ───────────────────────────────────────────────────

  updateDialogueLines: (nodeId, lines) => {
    set(s => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, dialogueLines: lines } : n)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  addDialogueLine: (nodeId) => {
    const line: DialogueLine = {
      id: uuidv4(),
      speaker: null,
      text: '',
      characterPose: null,
      position: 'center',
      sfx: null
    }
    const node = get().project.nodes.find(n => n.id === nodeId)
    if (!node) return
    get().updateDialogueLines(nodeId, [...node.dialogueLines, line])
  },

  // ── Variable effects helpers ───────────────────────────────────────────

  updateVariableEffects: (nodeId, effects) => {
    set(s => ({
      project: {
        ...s.project,
        nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, variables: effects } : n)
      },
      isDirty: true
    }))
    scheduleAutoSave(get)
  },

  // ── Undo/Redo ──────────────────────────────────────────────────────────

  snapshotForUndo: (type) => {
    const { project, undoStack } = get()
    const snapshot: UndoAction = {
      type,
      before: JSON.parse(JSON.stringify({ nodes: project.nodes, edges: project.edges })),
      after: {}
    }
    set({ undoStack: [...undoStack.slice(-49), snapshot], redoStack: [] })
  },

  undo: () => {
    const { undoStack, project } = get()
    if (!undoStack.length) return
    const action = undoStack[undoStack.length - 1]
    const current: UndoAction = {
      ...action,
      after: JSON.parse(JSON.stringify({ nodes: project.nodes, edges: project.edges }))
    }
    set(s => ({
      project: { ...s.project, ...(action.before as any) },
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
      isDirty: true
    }))
  },

  redo: () => {
    const { redoStack, project } = get()
    if (!redoStack.length) return
    const action = redoStack[redoStack.length - 1]
    const current: UndoAction = {
      ...action,
      before: JSON.parse(JSON.stringify({ nodes: project.nodes, edges: project.edges }))
    }
    set(s => ({
      project: { ...s.project, ...(action.after as any) },
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, current],
      isDirty: true
    }))
  },

  // ── Panel navigation ───────────────────────────────────────────────────

  navigateTo: (nodeId) => {
    const { project, panelNavHistory, selectedNodeId } = get()
    const exists = project.nodes.some(n => n.id === nodeId)
    if (!exists) return
    const newHistory = selectedNodeId && selectedNodeId !== nodeId
      ? [...panelNavHistory.slice(-9), selectedNodeId]
      : panelNavHistory
    set({ selectedNodeId: nodeId, panelNavHistory: newHistory })
  },

  // ── Save ───────────────────────────────────────────────────────────────

  markSaved: (path) => set(s => ({
    isDirty: false,
    project: {
      ...s.project,
      lastSaved: Date.now(),
      projectPath: path ?? s.project.projectPath
    }
  })),

  markDirty: () => set({ isDirty: true })
}))

// ── Auto-save helper ───────────────────────────────────────────────────────

let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleAutoSave(get: () => AppState) {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(() => {
    triggerSave(get())
  }, 30000)
}

async function triggerSave(state: AppState) {
  const { project } = state
  if (!project.projectPath) return
  const data = JSON.stringify(buildExportData(project), null, 2)
  const ok = await window.electronAPI?.writeFile(project.projectPath, data)
  if (ok) state.markSaved()
}

function buildExportData(project: Project) {
  return {
    meta: {
      app: 'Narrative Flow',
      version: '2.0',
      exported: new Date().toISOString(),
      projectName: project.name
    },
    nodes: project.nodes,
    edges: project.edges,
    characters: project.characters,
    variables: project.variables,
    assets: project.assets
  }
}
