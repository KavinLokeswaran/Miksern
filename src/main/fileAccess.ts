import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import { AUDIO_EXTENSIONS, type PickedFile, type ReadFileResult } from '../shared/ipc'

/**
 * Grensesnittet får bare lese filer brukeren selv har valgt.
 * Alle stier som er godkjent havner her.
 */
const allowedFiles = new Set<string>()

export function allowFile(path: string): void {
  allowedFiles.add(resolve(path))
}

export async function pickAudioFile(win: BrowserWindow | null): Promise<PickedFile | null> {
  const options: Electron.OpenDialogOptions = {
    title: 'Velg en låt',
    buttonLabel: 'Åpne',
    properties: ['openFile'],
    filters: [
      { name: 'Lydfiler', extensions: [...AUDIO_EXTENSIONS] },
      { name: 'Alle filer', extensions: ['*'] }
    ]
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return null
  const path = result.filePaths[0]
  allowFile(path)
  return { path, name: basename(path, extname(path)) }
}

export async function readAudioFile(path: unknown): Promise<ReadFileResult> {
  if (typeof path !== 'string') return { ok: false, reason: 'not-allowed' }
  const full = resolve(path)
  if (!allowedFiles.has(full)) return { ok: false, reason: 'not-allowed' }
  try {
    const data = await readFile(full)
    return { ok: true, data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    return { ok: false, reason: code === 'ENOENT' ? 'not-found' : 'unreadable' }
  }
}
