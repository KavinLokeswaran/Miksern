/** Typer for musikkbiblioteket, delt mellom main og grensesnittet. */
import type { BeatGrid } from './analysis'

/**
 * - ok:          kan spilles av
 * - protected:   kopibeskyttet (f.eks. Apple Music)
 * - unsupported: format appen ikke kan spille (f.eks. Apple Lossless)
 * - unreadable:  ødelagt eller uleselig fil
 */
export type TrackStatus = 'ok' | 'protected' | 'unsupported' | 'unreadable'

export interface TrackInfo {
  /** Stabil ID ut fra filstien. */
  id: string
  path: string
  /** Filnavn uten filendelse. */
  fileName: string
  /** Filendelse med små bokstaver, f.eks. "mp3". */
  ext: string
  title: string
  artist: string | null
  album: string | null
  /** Lengde i sekunder, hvis kjent. */
  duration: number | null
  /** BPM fra filens egne tagger (analysen i appen kommer i tillegg). */
  tagBpm: number | null
  size: number
  mtimeMs: number
  status: TrackStatus
}

/** Kort oppsummering av analysen for en låt (grid er null hvis tempoet var uklart). */
export interface AnalysisSummary {
  grid: BeatGrid | null
}

export interface LibrarySnapshot {
  folder: string | null
  tracks: TrackInfo[]
  /** Analyserte låter, etter låt-ID. */
  analysis: Record<string, AnalysisSummary>
  /** Tidspunkt (ms) for siste fullførte skanning. */
  scannedAt: number | null
}

export type ScanProgress =
  { phase: 'idle' } | { phase: 'finding'; found: number } | { phase: 'reading'; done: number; total: number }

export type ScanResult = { ok: true; library: LibrarySnapshot } | { ok: false; reason: 'no-folder' | 'folder-missing' }
