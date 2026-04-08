// ─── Core Data Model ────────────────────────────────────────────────────────

export type NodeType = 'scene' | 'decision' | 'grok' | 'death' | 'ending'
export type NodeStatus = 'todo' | 'inprog' | 'done'
export type DayBlock = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'All'
export type SceneTransition = 'fade' | 'cut' | 'slide-left' | 'slide-right'
export type SpritePosition = 'left' | 'center' | 'right'
export type AssetType = 'image' | 'audio'
export type VariableType = 'string' | 'boolean' | 'number'
export type VariableOperation = 'set' | 'add' | 'subtract' | 'toggle'

export interface Branch {
  option: string
  desc: string
  leads: string[]
  effects: string[]
  condition: string | null
}

export interface DialogueLine {
  id: string
  speaker: string | null
  text: string
  characterPose: string | null
  position: SpritePosition
  sfx: string | null
}

export interface VariableEffect {
  variableId: string
  operation: VariableOperation
  value: unknown
}

export interface StoryNode {
  id: string
  title: string
  type: NodeType
  status: NodeStatus
  day: number | null
  block: DayBlock | null
  path: string
  x: number
  y: number
  summary: string
  trigger: string
  chars: string[]
  branches: Branch[]
  dialogue: string
  grokHandoff: string
  consequences: string
  background: string | null
  music: string | null
  sfx: string | null
  transition: SceneTransition
  dialogueLines: DialogueLine[]
  variables: VariableEffect[]
}

export interface Edge {
  id: string
  from: string
  to: string
  label: string
  desc: string
  isDeath: boolean
}

export interface Sprite {
  id: string
  label: string
  assetId: string
}

export interface Character {
  id: string
  name: string
  color: string
  sprites: Sprite[]
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  filename: string
  path: string
}

export interface Variable {
  id: string
  name: string
  type: VariableType
  defaultValue: unknown
}

export interface Project {
  projectName: string
  nodes: StoryNode[]
  edges: Edge[]
  characters: Character[]
  variables: Variable[]
  assets: Asset[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function emptyProject(name = 'Untitled Project'): Project {
  return {
    projectName: name,
    nodes: [],
    edges: [],
    characters: [],
    variables: [],
    assets: []
  }
}

export function emptyNode(partial: Partial<StoryNode> & { id: string; x: number; y: number }): StoryNode {
  return {
    title: 'New Scene',
    type: 'scene',
    status: 'todo',
    day: null,
    block: null,
    path: '',
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
    variables: [],
    ...partial
  }
}

export function emptyDialogueLine(id: string): DialogueLine {
  return { id, speaker: null, text: '', characterPose: null, position: 'center', sfx: null }
}
