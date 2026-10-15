import { existsSync, statSync } from 'node:fs'
import { dialog, type BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc'
import type { LibrarySnapshot, ScanResult, TrackStatus } from '../../shared/library'
import { appData, librarySnapshot } from '../appData'
import { scanFolder } from './scan'

let runningScan: Promise<ScanResult> | null = null

export function getLibrary(): LibrarySnapshot {
  return librarySnapshot(appData().get())
}

/** Er dette en fil som ligger i biblioteket? Brukes for å gi grensesnittet lov til å lese den. */
export function isLibraryFile(path: string): boolean {
  return Object.values(appData().get().library.tracks).some((t) => t.path === path)
}

export async function pickLibraryFolder(win: BrowserWindow | null): Promise<ScanResult | null> {
  const options: Electron.OpenDialogOptions = {
    title: 'Velg mappa med musikken din',
    buttonLabel: 'Bruk denne mappa',
    properties: ['openDirectory']
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return null
  const folder = result.filePaths[0]
  appData().update((d) =>
    d.library.folder === folder ? d : { ...d, library: { folder, scannedAt: null, tracks: d.library.tracks } }
  )
  return rescanLibrary(win)
}

export function rescanLibrary(win: BrowserWindow | null): Promise<ScanResult> {
  runningScan ??= doScan(win).finally(() => {
    runningScan = null
  })
  return runningScan
}

async function doScan(win: BrowserWindow | null): Promise<ScanResult> {
  const folder = appData().get().library.folder
  if (!folder) return { ok: false, reason: 'no-folder' }
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return { ok: false, reason: 'folder-missing' }

  const tracks = await scanFolder(folder, appData().get().library.tracks, (progress) => {
    if (win && !win.isDestroyed()) win.webContents.send(IPC.scanProgress, progress)
  })
  // Brukeren kan ha byttet mappe mens vi skannet. Da gjelder ikke resultatet lenger.
  if (appData().get().library.folder !== folder) return { ok: true, library: getLibrary() }
  const data = appData().update((d) => ({ ...d, library: { folder, scannedAt: Date.now(), tracks } }))
  return { ok: true, library: librarySnapshot(data) }
}

const PROBLEMS: ReadonlySet<string> = new Set<TrackStatus>(['protected', 'unsupported', 'unreadable'])

/** Husker at en låt ikke kunne spilles, så den hoppes over neste gang. */
export function markTrackProblem(id: unknown, status: unknown): void {
  if (typeof id !== 'string' || typeof status !== 'string' || !PROBLEMS.has(status)) return
  appData().update((d) => {
    const track = d.library.tracks[id]
    if (!track) return d
    return {
      ...d,
      library: { ...d.library, tracks: { ...d.library.tracks, [id]: { ...track, status: status as TrackStatus } } }
    }
  })
}
