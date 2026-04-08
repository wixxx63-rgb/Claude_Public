import { ipcMain } from 'electron'
import { registerFileHandlers } from './fileHandlers'
import { registerAssetHandlers } from './assetHandlers'
import { registerDialogHandlers } from './dialogHandlers'

export function registerIpcHandlers(): void {
  registerFileHandlers(ipcMain)
  registerAssetHandlers(ipcMain)
  registerDialogHandlers(ipcMain)
}
