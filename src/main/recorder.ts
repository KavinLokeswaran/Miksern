import { createWriteStream, type WriteStream } from 'node:fs'
import { copyFile, open, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { app, dialog, type BrowserWindow } from 'electron'
import type { RecordingResult } from '../shared/ipc'
import { WAV_HEADER_BYTES, WAV_MAX_DATA_BYTES, wavHeader } from '../shared/wav'

/**
 * Opptak av miksen. Lyden skrives fortløpende til en midlertidig fil, så selv
 * lange opptak ikke bruker opp minnet. Når opptaket stoppes, velger brukeren hvor fila skal lagres.
 */
interface Session {
  file: string
  stream: WriteStream
  bytes: number
  sampleRate: number
  channels: number
}

let session: Session | null = null
/** Ferdig opptak som ikke er lagret ennå (f.eks. hvis brukeren avbrøt lagre-dialogen). */
let pending: { file: string; seconds: number } | null = null

export function startRecording(sampleRate: unknown, channels: unknown): boolean {
  if (session || typeof sampleRate !== 'number' || typeof channels !== 'number') return false
  if (sampleRate < 8000 || sampleRate > 384000 || (channels !== 1 && channels !== 2)) return false
  void discardRecording()
  const file = join(app.getPath('temp'), `mikseren-opptak-${Date.now()}.wav`)
  const stream = createWriteStream(file)
  stream.write(wavHeader(sampleRate, channels, 0))
  session = { file, stream, bytes: 0, sampleRate, channels }
  return true
}

export function writeRecordingChunk(data: unknown): void {
  if (!session || !(data instanceof Uint8Array)) return
  if (session.bytes + data.byteLength > WAV_MAX_DATA_BYTES) return
  session.stream.write(data)
  session.bytes += data.byteLength
}

export async function stopRecording(win: BrowserWindow | null): Promise<RecordingResult> {
  const current = session
  if (!current) return { status: 'error' }
  session = null
  await new Promise<void>((resolve) => current.stream.end(resolve))
  // Skriv riktig størrelse inn i filhodet nå som vi vet hvor langt opptaket ble.
  const handle = await open(current.file, 'r+')
  try {
    await handle.write(wavHeader(current.sampleRate, current.channels, current.bytes), 0, WAV_HEADER_BYTES, 0)
  } finally {
    await handle.close()
  }
  const seconds = current.bytes / (current.sampleRate * current.channels * 2)
  pending = { file: current.file, seconds }
  return saveRecording(win)
}

function defaultFileName(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `Miks ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}.wav`
}

async function moveFile(from: string, to: string): Promise<void> {
  try {
    await rename(from, to)
  } catch {
    // Ulike disker: kopier og slett.
    await copyFile(from, to)
    await unlink(from)
  }
}

/** Åpner lagre-dialogen for opptaket som venter. */
export async function saveRecording(win: BrowserWindow | null): Promise<RecordingResult> {
  if (!pending) return { status: 'error' }
  const { file, seconds } = pending
  let target: string | undefined
  if (!app.isPackaged && process.env.MIKSEREN_SMOKE_SAVE_PATH) {
    // Kun for automatiske tester: lagre uten dialog.
    target = process.env.MIKSEREN_SMOKE_SAVE_PATH
  } else {
    const options: Electron.SaveDialogOptions = {
      title: 'Lagre opptaket',
      buttonLabel: 'Lagre',
      defaultPath: join(app.getPath('music'), defaultFileName()),
      filters: [{ name: 'WAV-lyd', extensions: ['wav'] }]
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { status: 'unsaved', seconds }
    target = result.filePath
  }
  try {
    await moveFile(file, target)
    pending = null
    return { status: 'saved', path: target, seconds }
  } catch {
    return { status: 'unsaved', seconds, error: 'Klarte ikke å lagre fila der. Prøv en annen mappe.' }
  }
}

export async function discardRecording(): Promise<void> {
  const current = pending
  pending = null
  if (current) await unlink(current.file).catch(() => undefined)
}

/** Rydd opp hvis appen avsluttes midt i et opptak. */
export function abortRecording(): void {
  if (session) {
    session.stream.destroy()
    session = null
  }
}
