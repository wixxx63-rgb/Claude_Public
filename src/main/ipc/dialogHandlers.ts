import { dialog, BrowserWindow } from 'electron'
import type { IpcMain } from 'electron'
import { IPC } from '../../shared/ipc-constants'

export function registerDialogHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.DIALOG_CONFIRM, async (_e, { message, detail }: { message: string; detail?: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showMessageBox(win!, {
      type: 'question',
      buttons: ['Cancel', 'Confirm'],
      defaultId: 1,
      cancelId: 0,
      message,
      detail
    })
    return { confirmed: result.response === 1 }
  })
}
