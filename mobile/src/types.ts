export interface Character {
  id: string
  name: string
  color: string
  sprites: { id: string; label: string; assetId: string }[]
}

export interface DialogueLine {
  speaker: string
  text: string
  pose?: string
}

export interface Branch {
  option: string
  desc: string
  leads: string[]
  effects: string[]
  condition: string | null
}

export interface StoryNode {
  id: string
  title: string
  type: 'scene' | 'decision' | 'death' | 'ending' | 'grok'
  summary: string
  dialogueLines: DialogueLine[]
  branches: Branch[]
  background: string | null
  isPov: boolean
  povCharacter: string | null
  day: number | null
  block: string
}

export interface Edge {
  id: string
  from: string
  to: string
  label: string
  isDeath: boolean
}

export interface Asset {
  id: string
  name: string
  type: string
  path: string
  // base64 data embedded in HTML exports
  data?: string
}

export interface Project {
  name: string
  nodes: StoryNode[]
  edges: Edge[]
  characters: Character[]
  assets: Asset[]
}
