/** Navn på IPC-kanalene mellom main og renderer. */
export const IPC = {
  pickAudioFile: 'file:pickAudio',
  readAudioFile: 'file:readAudio'
} as const

/** Filtyper appen kan spille av. */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'aac'] as const

export interface PickedFile {
  path: string
  /** Filnavn uten mappe og filendelse. */
  name: string
}

export type ReadFileResult =
  | { ok: true; data: Uint8Array }
  | { ok: false; reason: 'not-allowed' | 'not-found' | 'unreadable' }

/** API-et som preload gir til grensesnittet (window.mikseren). */
export interface MikserenApi {
  platform: string
  pickAudioFile(): Promise<PickedFile | null>
  readAudioFile(path: string): Promise<ReadFileResult>
}
