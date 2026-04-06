export type NodeType = 'scene' | 'decision' | 'grok' | 'death' | 'ending'
export type NodeStatus = 'todo' | 'inprog' | 'done'

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
  position: 'left' | 'center' | 'right'
}

export interface Character {
  id: string
  name: string
  color: string
  sprites: any[]
}

export interface StoryNode {
  id: string
  title: string
  type: NodeType
  status: NodeStatus
  x: number
  y: number
  path: string
  summary: string
  trigger: string
  chars: string[]
  branches: Branch[]
  dialogue: string
  grokHandoff: string
  consequences: string
  dialogueLines: DialogueLine[]
  day: number | null
  block: string | null
  background: string | null
  music: string | null
  transition: string
  variables: any[]
  isPov: boolean
  povCharacter: string | null
}

export interface Edge {
  id: string
  from: string
  to: string
  label: string
  desc: string
  isDeath: boolean
}

export interface Project {
  id: string
  name: string
  nodes: StoryNode[]
  edges: Edge[]
  characters: Character[]
  variables: any[]
  assets: any[]
  playthroughs: any[]
  writerRoom: any[]
  projectPath: string | null
  lastSaved: string | null
}

export function makeNode(id: string, x: number, y: number, title = 'New Scene'): StoryNode {
  return {
    id, title, type: 'scene', status: 'todo',
    x, y, path: '', summary: '', trigger: '', chars: [],
    branches: [], dialogue: '', grokHandoff: '', consequences: '',
    dialogueLines: [], day: null, block: null, background: null,
    music: null, transition: 'fade', variables: [],
    isPov: false, povCharacter: null,
  }
}

export function emptyProject(): Project {
  const nodeId = crypto.randomUUID()
  return {
    id: crypto.randomUUID(), name: 'New Story',
    nodes: [{ ...makeNode(nodeId, 300, 300), title: 'Opening Scene' }],
    edges: [], characters: [], variables: [], assets: [],
    playthroughs: [], writerRoom: [], projectPath: null, lastSaved: null,
  }
}

export function normalizeProject(raw: any): Project {
  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name ?? 'Untitled',
    nodes: (raw.nodes ?? []).map((n: any): StoryNode => ({
      id: n.id ?? crypto.randomUUID(),
      title: n.title ?? 'Untitled',
      type: n.type ?? 'scene',
      status: n.status ?? 'todo',
      x: typeof n.x === 'number' ? n.x : Math.random() * 600 + 100,
      y: typeof n.y === 'number' ? n.y : Math.random() * 600 + 100,
      path: n.path ?? '',
      summary: n.summary ?? '',
      trigger: n.trigger ?? '',
      chars: n.chars ?? [],
      branches: (n.branches ?? []).map((b: any): Branch => ({
        option: b.option ?? '',
        desc: b.desc ?? '',
        leads: b.leads ?? [],
        effects: b.effects ?? [],
        condition: b.condition ?? null,
      })),
      dialogue: n.dialogue ?? '',
      grokHandoff: n.grokHandoff ?? '',
      consequences: n.consequences ?? '',
      dialogueLines: (n.dialogueLines ?? []).map((d: any): DialogueLine => ({
        id: d.id ?? crypto.randomUUID(),
        speaker: d.speaker ?? null,
        text: d.text ?? '',
        position: d.position ?? 'left',
      })),
      day: n.day ?? null,
      block: n.block ?? null,
      background: n.background ?? null,
      music: n.music ?? null,
      transition: n.transition ?? 'fade',
      variables: n.variables ?? [],
      isPov: n.isPov ?? false,
      povCharacter: n.povCharacter ?? null,
    })),
    edges: (raw.edges ?? []).map((e: any): Edge => ({
      id: e.id ?? crypto.randomUUID(),
      from: e.from ?? '',
      to: e.to ?? '',
      label: e.label ?? '',
      desc: e.desc ?? '',
      isDeath: e.isDeath ?? false,
    })),
    characters: (raw.characters ?? []).map((c: any): Character => ({
      id: c.id ?? crypto.randomUUID(),
      name: c.name ?? 'Character',
      color: c.color ?? '#888888',
      sprites: c.sprites ?? [],
    })),
    variables: raw.variables ?? [],
    assets: raw.assets ?? [],
    playthroughs: raw.playthroughs ?? [],
    writerRoom: raw.writerRoom ?? [],
    projectPath: raw.projectPath ?? null,
    lastSaved: raw.lastSaved ?? null,
  }
}
