import { app, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { buildMenu } from './menu'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d0d14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// Register asset:// protocol for serving local asset files
// This avoids CSP issues with file:// URLs
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
])

app.whenReady().then(() => {
  protocol.handle('asset', (request) => {
    // asset://local/path/to/file → file at that path
    const filePath = request.url.replace('asset://local', '')
    return net.fetch(`file://${decodeURIComponent(filePath)}`)
  })

  registerIpcHandlers()
  const win = createWindow()
  buildMenu(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
