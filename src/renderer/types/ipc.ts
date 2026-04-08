import type { Project, Asset } from './project'

// ─── Channel Names ───────────────────────────────────────────────────────────

export const IPC = {
  PROJECT_NEW: 'project:new',
  PROJECT_OPEN: 'project:open',
  PROJECT_SAVE: 'project:save',
  PROJECT_SAVE_AS: 'project:saveAs',
  PROJECT_EXPORT_JSON: 'project:export-json',
  PROJECT_EXPORT_XML: 'project:export-xml',
  PROJECT_IMPORT_JSON: 'project:import-json',
  PROJECT_IMPORT_XML: 'project:import-xml',
  ASSET_IMPORT: 'asset:import',
  ASSET_GET_PATH: 'asset:get-path',
  DIALOG_CONFIRM: 'dialog:show-confirm',

  // main → renderer (menu events)
  MENU_NEW: 'menu:new',
  MENU_OPEN: 'menu:open',
  MENU_SAVE: 'menu:save',
  MENU_SAVE_AS: 'menu:saveAs',
  MENU_UNDO: 'menu:undo',
  MENU_REDO: 'menu:redo'
} as const

// ─── Payload Types ───────────────────────────────────────────────────────────

export interface OpenProjectResult {
  project: Project
  filePath: string
}

export interface SaveProjectPayload {
  project: Project
  filePath: string
}

export interface SaveProjectResult {
  filePath: string
}

export interface ImportAssetPayload {
  type: 'image' | 'audio'
  projectDir: string
}

export interface ImportAssetResult {
  asset: Asset
}

export interface GetAssetPathPayload {
  assetId: string
  projectDir: string
}

export interface GetAssetPathResult {
  absolutePath: string
}

export interface ConfirmDialogPayload {
  message: string
  detail?: string
}

export interface ConfirmDialogResult {
  confirmed: boolean
}

// ─── ElectronAPI interface (matched by preload) ──────────────────────────────

export interface ElectronAPI {
  invoke(channel: typeof IPC.PROJECT_OPEN, payload?: undefined): Promise<OpenProjectResult | null>
  invoke(channel: typeof IPC.PROJECT_SAVE, payload: SaveProjectPayload): Promise<SaveProjectResult>
  invoke(channel: typeof IPC.PROJECT_SAVE_AS, payload: { project: Project }): Promise<SaveProjectResult | null>
  invoke(channel: typeof IPC.PROJECT_EXPORT_JSON, payload: { project: Project }): Promise<{ success: boolean }>
  invoke(channel: typeof IPC.PROJECT_EXPORT_XML, payload: { project: Project }): Promise<{ success: boolean }>
  invoke(channel: typeof IPC.PROJECT_IMPORT_JSON, payload?: undefined): Promise<OpenProjectResult | null>
  invoke(channel: typeof IPC.PROJECT_IMPORT_XML, payload?: undefined): Promise<OpenProjectResult | null>
  invoke(channel: typeof IPC.ASSET_IMPORT, payload: ImportAssetPayload): Promise<ImportAssetResult | null>
  invoke(channel: typeof IPC.ASSET_GET_PATH, payload: GetAssetPathPayload): Promise<GetAssetPathResult>
  invoke(channel: typeof IPC.DIALOG_CONFIRM, payload: ConfirmDialogPayload): Promise<ConfirmDialogResult>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoke(channel: string, payload?: unknown): Promise<unknown>

  on(channel: string, listener: (...args: unknown[]) => void): () => void
}
