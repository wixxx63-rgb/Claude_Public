import { create } from 'zustand'
import type { Project, StoryNode, Edge, Character, DialogueLine, Branch } from './types'
import { emptyProject, normalizeProject } from './types'

interface AppState {
  project: Project
  isDirty: boolean
  // actions
  loadProject: (p: Project) => void
  setProjectName: (name: string) => void
  // nodes
  addNode: (node: StoryNode) => void
  updateNode: (id: string, patch: Partial<StoryNode>) => void
  deleteNode: (id: string) => void
  // edges
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  // characters
  addCharacter: (c: Character) => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  // dialogue
  addDialogueLine: (nodeId: string, line: DialogueLine) => void
  updateDialogueLine: (nodeId: string, lineId: string, patch: Partial<DialogueLine>) => void
  deleteDialogueLine: (nodeId: string, lineId: string) => void
  reorderDialogueLines: (nodeId: string, lines: DialogueLine[]) => void
  // branches
  addBranch: (nodeId: string, branch: Branch) => void
  updateBranch: (nodeId: string, idx: number, patch: Partial<Branch>) => void
  deleteBranch: (nodeId: string, idx: number) => void
  // serialize
  serialize: () => string
  markSaved: () => void
}

export const useStore = create<AppState>((set, get) => ({
  project: emptyProject(),
  isDirty: false,

  loadProject: (p) => set({ project: normalizeProject(p), isDirty: false }),
  setProjectName: (name) => set(s => ({ project: { ...s.project, name }, isDirty: true })),

  addNode: (node) => set(s => ({ project: { ...s.project, nodes: [...s.project.nodes, node] }, isDirty: true })),
  updateNode: (id, patch) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === id ? { ...n, ...patch } : n) },
    isDirty: true,
  })),
  deleteNode: (id) => set(s => ({
    project: {
      ...s.project,
      nodes: s.project.nodes.filter(n => n.id !== id),
      edges: s.project.edges.filter(e => e.from !== id && e.to !== id),
    },
    isDirty: true,
  })),

  addEdge: (edge) => set(s => ({ project: { ...s.project, edges: [...s.project.edges, edge] }, isDirty: true })),
  deleteEdge: (id) => set(s => ({ project: { ...s.project, edges: s.project.edges.filter(e => e.id !== id) }, isDirty: true })),

  addCharacter: (c) => set(s => ({ project: { ...s.project, characters: [...s.project.characters, c] }, isDirty: true })),
  updateCharacter: (id, patch) => set(s => ({
    project: { ...s.project, characters: s.project.characters.map(c => c.id === id ? { ...c, ...patch } : c) },
    isDirty: true,
  })),
  deleteCharacter: (id) => set(s => ({ project: { ...s.project, characters: s.project.characters.filter(c => c.id !== id) }, isDirty: true })),

  addDialogueLine: (nodeId, line) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, dialogueLines: [...n.dialogueLines, line] } : n) },
    isDirty: true,
  })),
  updateDialogueLine: (nodeId, lineId, patch) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, dialogueLines: n.dialogueLines.map(l => l.id === lineId ? { ...l, ...patch } : l) } : n) },
    isDirty: true,
  })),
  deleteDialogueLine: (nodeId, lineId) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, dialogueLines: n.dialogueLines.filter(l => l.id !== lineId) } : n) },
    isDirty: true,
  })),
  reorderDialogueLines: (nodeId, lines) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, dialogueLines: lines } : n) },
    isDirty: true,
  })),

  addBranch: (nodeId, branch) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, branches: [...n.branches, branch] } : n) },
    isDirty: true,
  })),
  updateBranch: (nodeId, idx, patch) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, branches: n.branches.map((b, i) => i === idx ? { ...b, ...patch } : b) } : n) },
    isDirty: true,
  })),
  deleteBranch: (nodeId, idx) => set(s => ({
    project: { ...s.project, nodes: s.project.nodes.map(n => n.id === nodeId ? { ...n, branches: n.branches.filter((_, i) => i !== idx) } : n) },
    isDirty: true,
  })),

  serialize: () => JSON.stringify(get().project, null, 2),
  markSaved: () => set(s => ({ project: { ...s.project, lastSaved: new Date().toISOString() }, isDirty: false })),
}))
