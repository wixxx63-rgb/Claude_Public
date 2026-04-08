import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import type { Project, StoryNode, Edge, Character, Variable, Asset } from '../types/project'
import { emptyProject } from '../types/project'

// ─── JSON ────────────────────────────────────────────────────────────────────

export interface ExportEnvelope {
  meta: {
    app: string
    version: string
    exported: string
    projectName: string
  }
  nodes: StoryNode[]
  edges: Edge[]
  characters: Character[]
  variables: Variable[]
  assets: Asset[]
}

export function projectToJSON(project: Project): string {
  const envelope: ExportEnvelope = {
    meta: {
      app: 'Narrative Flow',
      version: '2.0',
      exported: new Date().toISOString(),
      projectName: project.projectName
    },
    nodes: project.nodes,
    edges: project.edges,
    characters: project.characters,
    variables: project.variables,
    assets: project.assets
  }
  return JSON.stringify(envelope, null, 2)
}

export function projectFromJSON(json: string): Project {
  const data = JSON.parse(json)
  // Support both envelope format and raw project
  const source = data.meta ? data : { ...data, meta: {} }
  return normalizeProject({
    projectName: source.meta?.projectName ?? source.projectName ?? 'Imported Project',
    nodes: source.nodes ?? [],
    edges: source.edges ?? [],
    characters: source.characters ?? [],
    variables: source.variables ?? [],
    assets: source.assets ?? []
  })
}

// ─── XML ────────────────────────────────────────────────────────────────────

// Fields that must always be arrays even if XML has only one element
const ALWAYS_ARRAY = new Set([
  'nodes', 'edges', 'characters', 'variables', 'assets',
  'branches', 'dialogueLines', 'chars', 'effects', 'leads',
  'sprites', 'variableEffects', 'node', 'edge', 'character',
  'variable', 'asset', 'branch', 'dialogueLine', 'sprite'
])

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: (name) => ALWAYS_ARRAY.has(name)
})

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  format: true,
  indentBy: '  '
})

export function projectToXML(project: Project): string {
  const envelope: ExportEnvelope = {
    meta: {
      app: 'Narrative Flow',
      version: '2.0',
      exported: new Date().toISOString(),
      projectName: project.projectName
    },
    nodes: project.nodes,
    edges: project.edges,
    characters: project.characters,
    variables: project.variables,
    assets: project.assets
  }
  return xmlBuilder.build({ narrativeFlow: envelope })
}

export function projectFromXML(xml: string): Project {
  const parsed = xmlParser.parse(xml)
  const root = parsed.narrativeFlow ?? parsed
  return normalizeProject({
    projectName: root.meta?.projectName ?? 'Imported Project',
    nodes: root.nodes?.node ?? root.nodes ?? [],
    edges: root.edges?.edge ?? root.edges ?? [],
    characters: root.characters?.character ?? root.characters ?? [],
    variables: root.variables?.variable ?? root.variables ?? [],
    assets: root.assets?.asset ?? root.assets ?? []
  })
}

// ─── Normalization ───────────────────────────────────────────────────────────
// Ensures imported data matches the expected shape, filling defaults for
// any missing fields so the app never crashes on older or partial data.

function normalizeProject(raw: Partial<Project>): Project {
  const base = emptyProject(raw.projectName ?? 'Imported Project')
  return {
    ...base,
    projectName: raw.projectName ?? base.projectName,
    nodes: (raw.nodes ?? []).map(normalizeNode),
    edges: (raw.edges ?? []).map(normalizeEdge),
    characters: (raw.characters ?? []).map(normalizeCharacter),
    variables: (raw.variables ?? []).map(normalizeVariable),
    assets: (raw.assets ?? []).map(normalizeAsset)
  }
}

function normalizeNode(n: Partial<StoryNode> & { id?: string }): StoryNode {
  return {
    id: String(n.id ?? ''),
    title: String(n.title ?? ''),
    type: (['scene','decision','grok','death','ending'].includes(n.type ?? '') ? n.type : 'scene') as StoryNode['type'],
    status: (['todo','inprog','done'].includes(n.status ?? '') ? n.status : 'todo') as StoryNode['status'],
    day: n.day != null ? Number(n.day) : null,
    block: n.block ?? null,
    path: String(n.path ?? ''),
    x: Number(n.x ?? 0),
    y: Number(n.y ?? 0),
    summary: String(n.summary ?? ''),
    trigger: String(n.trigger ?? ''),
    chars: Array.isArray(n.chars) ? n.chars.map(String) : [],
    branches: Array.isArray(n.branches) ? n.branches.map(normalizeBranch) : [],
    dialogue: String(n.dialogue ?? ''),
    grokHandoff: String(n.grokHandoff ?? ''),
    consequences: String(n.consequences ?? ''),
    background: n.background ?? null,
    music: n.music ?? null,
    sfx: n.sfx ?? null,
    transition: (['fade','cut','slide-left','slide-right'].includes(n.transition ?? '') ? n.transition : 'fade') as StoryNode['transition'],
    dialogueLines: Array.isArray(n.dialogueLines) ? n.dialogueLines.map(normalizeDialogueLine) : [],
    variables: Array.isArray(n.variables) ? n.variables.map(normalizeVariableEffect) : []
  }
}

function normalizeBranch(b: Partial<StoryNode['branches'][0]>): StoryNode['branches'][0] {
  return {
    option: String(b.option ?? ''),
    desc: String(b.desc ?? ''),
    leads: Array.isArray(b.leads) ? b.leads.map(String) : [],
    effects: Array.isArray(b.effects) ? b.effects.map(String) : [],
    condition: b.condition ?? null
  }
}

function normalizeDialogueLine(d: Partial<StoryNode['dialogueLines'][0]>): StoryNode['dialogueLines'][0] {
  return {
    id: String(d.id ?? ''),
    speaker: d.speaker ?? null,
    text: String(d.text ?? ''),
    characterPose: d.characterPose ?? null,
    position: (['left','center','right'].includes(d.position ?? '') ? d.position : 'center') as 'left'|'center'|'right',
    sfx: d.sfx ?? null
  }
}

function normalizeVariableEffect(e: Partial<StoryNode['variables'][0]>): StoryNode['variables'][0] {
  return {
    variableId: String(e.variableId ?? ''),
    operation: (['set','add','subtract','toggle'].includes(e.operation ?? '') ? e.operation : 'set') as StoryNode['variables'][0]['operation'],
    value: e.value ?? null
  }
}

function normalizeEdge(e: Partial<Edge> & { id?: string }): Edge {
  return {
    id: String(e.id ?? ''),
    from: String(e.from ?? ''),
    to: String(e.to ?? ''),
    label: String(e.label ?? ''),
    desc: String(e.desc ?? ''),
    isDeath: Boolean(e.isDeath)
  }
}

function normalizeCharacter(c: Partial<Character> & { id?: string }): Character {
  return {
    id: String(c.id ?? ''),
    name: String(c.name ?? ''),
    color: String(c.color ?? '#ffffff'),
    sprites: Array.isArray(c.sprites) ? c.sprites.map(s => ({
      id: String(s.id ?? ''),
      label: String(s.label ?? ''),
      assetId: String(s.assetId ?? '')
    })) : []
  }
}

function normalizeVariable(v: Partial<Variable> & { id?: string }): Variable {
  return {
    id: String(v.id ?? ''),
    name: String(v.name ?? ''),
    type: (['string','boolean','number'].includes(v.type ?? '') ? v.type : 'string') as Variable['type'],
    defaultValue: v.defaultValue ?? null
  }
}

function normalizeAsset(a: Partial<Asset> & { id?: string }): Asset {
  return {
    id: String(a.id ?? ''),
    name: String(a.name ?? ''),
    type: (['image','audio'].includes(a.type ?? '') ? a.type : 'image') as Asset['type'],
    filename: String(a.filename ?? ''),
    path: String(a.path ?? '')
  }
}
