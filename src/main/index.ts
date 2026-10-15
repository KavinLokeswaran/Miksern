import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { APP_NAME } from '../shared/appInfo'
import { IPC } from '../shared/ipc'
import { appData } from './appData'
import { addAccessRule, pickAudioFile, readAudioFile } from './fileAccess'
import { getLibrary, isLibraryFile, markTrackProblem, pickLibraryFolder, rescanLibrary } from './library/libraryService'
import { buildMenu } from './menu'
import { setupSmokeTest } from './smoke'

app.setName(APP_NAME)

// Kun for utvikling og automatiske tester: bruk en egen datamappe.
if (!app.isPackaged && process.env.MIKSEREN_USER_DATA) app.setPath('userData', process.env.MIKSEREN_USER_DATA)

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 740,
    title: APP_NAME,
    backgroundColor: '#0e1014',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // En DJ-app må kunne spille lyd uten at man først klikker i vinduet.
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  win.once('ready-to-show', () => win.show())

  // Ingen navigering bort fra appen. Eksterne lenker åpnes i nettleseren.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })

  setupSmokeTest(win)

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

app.whenReady().then(() => {
  buildMenu()

  ipcMain.handle(IPC.pickAudioFile, (event) => pickAudioFile(BrowserWindow.fromWebContents(event.sender)))
  ipcMain.handle(IPC.readAudioFile, (_event, path: unknown) => readAudioFile(path))
  ipcMain.handle(IPC.getLibrary, () => getLibrary())
  ipcMain.handle(IPC.pickLibraryFolder, (event) => pickLibraryFolder(BrowserWindow.fromWebContents(event.sender)))
  ipcMain.handle(IPC.rescanLibrary, (event) => rescanLibrary(BrowserWindow.fromWebContents(event.sender)))
  ipcMain.handle(IPC.markTrackProblem, (_event, id: unknown, status: unknown) => markTrackProblem(id, status))
  addAccessRule(isLibraryFile)

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => appData().flush())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
