import { create } from 'zustand'
import type { ScanProgress, TrackInfo } from '@shared/library'
import type { SortOrder } from '../library/filterSort'

export interface LibraryState {
  /** Har vi hentet biblioteket fra disk ennå? */
  ready: boolean
  folder: string | null
  tracks: TrackInfo[]
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
