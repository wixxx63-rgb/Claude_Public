import { dialog, BrowserWindow } from 'electron'
import type { IpcMain } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { IPC } from '../../shared/ipc-constants'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export function registerFileHandlers(ipcMain: IpcMain): void {

  ipcMain.handle(IPC.PROJECT_OPEN, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Open Project',
      filters: [
        { name: 'Narrative Flow Project', extensions: ['nfp', 'json'] },
        { name: 'XML Project', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return loadProjectFromDisk(result.filePaths[0])
  })

  ipcMain.handle(IPC.PROJECT_SAVE, async (_e, { project, filePath }: { project: unknown; filePath: string }) => {
    const json = JSON.stringify(wrapEnvelope(project), null, 2)
    ensureDir(dirname(filePath))
    writeFileSync(filePath, json, 'utf-8')
    return { filePath }
  })

  ipcMain.handle(IPC.PROJECT_SAVE_AS, async (_e, { project }: { project: unknown }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Save Project As',
      defaultPath: 'my-story.nfp',
      filters: [{ name: 'Narrative Flow Project', extensions: ['nfp', 'json'] }]
    })
    if (result.canceled || !result.filePath) return null
    const json = JSON.stringify(wrapEnvelope(project), null, 2)
    ensureDir(dirname(result.filePath))
    writeFileSync(result.filePath, json, 'utf-8')
    return { filePath: result.filePath }
  })

  ipcMain.handle(IPC.PROJECT_EXPORT_JSON, async (_e, { project }: { project: unknown }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export as JSON',
      defaultPath: 'narrative-flow-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }
    writeFileSync(result.filePath, JSON.stringify(wrapEnvelope(project), null, 2), 'utf-8')
    return { success: true }
  })

  ipcMain.handle(IPC.PROJECT_EXPORT_XML, async (_e, { project }: { project: unknown }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export as XML',
      defaultPath: 'narrative-flow-export.xml',
      filters: [{ name: 'XML', extensions: ['xml'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }
    const builder = new XMLBuilder({ ignoreAttributes: false, format: true, indentBy: '  ' })
    writeFileSync(result.filePath, builder.build({ narrativeFlow: wrapEnvelope(project) }), 'utf-8')
    return { success: true }
  })

  ipcMain.handle(IPC.PROJECT_IMPORT_JSON, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import JSON Project',
      filters: [{ name: 'JSON', extensions: ['json', 'nfp'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return loadProjectFromDisk(result.filePaths[0])
  })

  ipcMain.handle(IPC.PROJECT_IMPORT_XML, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import XML Project',
      filters: [{ name: 'XML', extensions: ['xml'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return loadProjectFromDisk(result.filePaths[0])
  })
}

function loadProjectFromDisk(filePath: string): { project: unknown; filePath: string } {
  const raw = readFileSync(filePath, 'utf-8').trim()
  let project: unknown

  if (raw.startsWith('<')) {
    // XML
    const parser = new XMLParser({ ignoreAttributes: false })
    const parsed = parser.parse(raw)
    const root = (parsed as Record<string, unknown>).narrativeFlow ?? parsed
    project = extractProject(root as Record<string, unknown>)
  } else {
    const data = JSON.parse(raw) as Record<string, unknown>
    project = data.meta ? extractProject(data) : data
  }

  return { project, filePath }
}

function extractProject(data: Record<string, unknown>): unknown {
  return {
    projectName: (data.meta as Record<string, unknown>)?.projectName ?? data.projectName ?? 'Imported Project',
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    characters: data.characters ?? [],
    variables: data.variables ?? [],
    assets: data.assets ?? []
  }
}

function wrapEnvelope(project: unknown) {
  return {
    meta: {
      app: 'Narrative Flow',
      version: '2.0',
      exported: new Date().toISOString(),
      projectName: (project as Record<string, unknown>).projectName ?? 'Project'
    },
    ...(project as Record<string, unknown>)
  }
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

// Keep a reference to the project directory so assets can be resolved
export function getAssetsDir(projectFilePath: string): string {
  return join(dirname(projectFilePath), 'assets')
}
