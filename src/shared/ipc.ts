import type { TrackAnalysis, WaveformBytes } from './analysis'
import type { LibrarySnapshot, ScanProgress, ScanResult, TrackStatus } from './library'

/** Navn på IPC-kanalene mellom main og renderer. */
export const IPC = {
  pickAudioFile: 'file:pickAudio',
  readAudioFile: 'file:readAudio',
  getLibrary: 'library:get',
  pickLibraryFolder: 'library:pickFolder',
  rescanLibrary: 'library:rescan',
  markTrackProblem: 'library:markProblem',
  scanProgress: 'library:progress',
  getAnalysis: 'analysis:get',
  saveAnalysis: 'analysis:save'
} as const

/** Filtyper appen kan spille av. */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'aac'] as const

export interface PickedFile {
  path: string
  /** Filnavn uten mappe og filendelse. */
  name: string
}

export interface StoredAnalysis {
  analysis: TrackAnalysis
  waveform: WaveformBytes
}

export type ReadFileResult =
  | { ok: true; data: Uint8Array }
  | { ok: false; reason: 'not-allowed' | 'not-found' | 'unreadable' }

/** API-et som preload gir til grensesnittet (window.mikseren). */
export interface MikserenApi {
  platform: string
  pickAudioFile(): Promise<PickedFile | null>
  readAudioFile(path: string): Promise<ReadFileResult>
  getLibrary(): Promise<LibrarySnapshot>
  /** Åpner mappevelgeren og skanner. Gir null hvis brukeren avbryter. */
  pickLibraryFolder(): Promise<ScanResult | null>
  rescanLibrary(): Promise<ScanResult>
  markTrackProblem(id: string, status: Exclude<TrackStatus, 'ok'>): Promise<void>
  /** Henter lagret analyse for en fil, eller null hvis den ikke er analysert (eller er endret siden). */
  getAnalysis(path: string): Promise<StoredAnalysis | null>
  /** Lagrer analysen. Gir låt-ID-en tilbake, eller null hvis det ikke gikk. */
  saveAnalysis(path: string, analysis: TrackAnalysis, waveform: WaveformBytes): Promise<string | null>
  /** Lytt på fremdrift under skanning. Returnerer en funksjon som slutter å lytte. */
  onScanProgress(listener: (progress: ScanProgress) => void): () => void
}
