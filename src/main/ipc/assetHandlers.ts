import { dialog, BrowserWindow } from 'electron'
import type { IpcMain } from 'electron'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { IPC } from '../../shared/ipc-constants'

let assetCounter = 0

export function registerAssetHandlers(ipcMain: IpcMain): void {

  ipcMain.handle(IPC.ASSET_IMPORT, async (_e, { type, projectDir }: { type: 'image' | 'audio'; projectDir: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    const filters = type === 'image'
      ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
      : [{ name: 'Audio', extensions: ['mp3', 'ogg', 'wav', 'flac', 'm4a'] }]

    const result = await dialog.showOpenDialog(win!, {
      title: `Import ${type === 'image' ? 'Image' : 'Audio'} Asset`,
      filters,
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths[0]) return null

    const srcPath = result.filePaths[0]
    const filename = basename(srcPath)
    const assetsDir = join(projectDir, 'assets')

    if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, { recursive: true })
    }

    // Generate a unique filename to avoid collisions
    const id = `asset-${Date.now()}-${++assetCounter}`
    const ext = extname(filename)
    const destFilename = `${id}${ext}`
    const destPath = join(assetsDir, destFilename)

    copyFileSync(srcPath, destPath)

    return {
      asset: {
        id,
        name: basename(filename, ext),
        type,
        filename: destFilename,
        path: `assets/${destFilename}`
      }
    }
  })

  ipcMain.handle(IPC.ASSET_GET_PATH, (_e, { assetId, projectDir }: { assetId: string; projectDir: string }) => {
    // This is a fallback — normally assets are served via asset:// protocol
    // We return an asset:// URL that the renderer can use
    const url = `asset://local${join(projectDir, 'assets', assetId).replace(/\\/g, '/')}`
    return { absolutePath: url }
  })
}
