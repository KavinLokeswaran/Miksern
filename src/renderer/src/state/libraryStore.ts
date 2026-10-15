import { create } from 'zustand'
import type { AnalysisSummary, ScanProgress, TrackInfo } from '@shared/library'
import type { SortOrder } from '../library/filterSort'

export interface LibraryState {
  /** Har vi hentet biblioteket fra disk ennå? */
  ready: boolean
  folder: string | null
  tracks: TrackInfo[]
  /** BPM og beatgrid for låter som er analysert, etter låt-ID. */
  analysis: Record<string, AnalysisSummary>
  /** Fremdrift for bakgrunnsanalysen, eller null når alt er analysert. */
  analysisProgress: { done: number; total: number } | null
  scannedAt: number | null
  progress: ScanProgress
  /** Vennlig feilmelding om mappa, f.eks. hvis den er borte. */
  folderError: string | null
  search: string
  sort: SortOrder
}

/** Musikkbiblioteket. Endres bare via dispatch(). */
export const useLibraryStore = create<LibraryState>()(() => ({
  ready: false,
  folder: null,
  tracks: [],
  analysis: {},
  analysisProgress: null,
  scannedAt: null,
  progress: { phase: 'idle' },
  folderError: null,
  search: '',
  sort: { key: 'title', direction: 'asc' }
}))

export function updateLibrary(patch: Partial<LibraryState>): void {
  useLibraryStore.setState(patch)
}

export function findTrack(id: string): TrackInfo | undefined {
  return useLibraryStore.getState().tracks.find((t) => t.id === id)
}

export function setTrackAnalysis(id: string, summary: AnalysisSummary): void {
  useLibraryStore.setState((s) => ({ analysis: { ...s.analysis, [id]: summary } }))
}

/** Husk at låten ikke kunne spilles, så den hoppes over i listen heretter. */
export function markTrackUnplayable(trackId: string): void {
  void window.mikseren.markTrackProblem(trackId, 'unreadable')
  useLibraryStore.setState((s) => ({
    tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, status: 'unreadable' } : t))
  }))
}
