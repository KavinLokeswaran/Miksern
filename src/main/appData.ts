import { join } from 'node:path'
import { app } from 'electron'
import { ANALYSIS_VERSION, type TrackAnalysis } from '../shared/analysis'
import type { AnalysisSummary, LibrarySnapshot, TrackInfo } from '../shared/library'
import { JsonFile } from './persist'

/** Alt appen husker, lagret i én JSON-fil i appens datamappe. */
export interface AppData {
  version: 1
  library: {
    folder: string | null
    scannedAt: number | null
    tracks: Record<string, TrackInfo>
  }
  /** BPM og beatgrid per låt-ID. Bølgeformene ligger i egne filer. */
  analysis: Record<string, StoredAnalysisEntry>
}

export interface StoredAnalysisEntry extends TrackAnalysis {
  /** Filens størrelse og endringstid da den ble analysert. Endres fila, analyseres den på nytt. */
  size: number
  mtimeMs: number
}

export function isAnalysisValid(
  entry: StoredAnalysisEntry | undefined,
  size: number,
  mtimeMs: number
): entry is StoredAnalysisEntry {
  return !!entry && entry.version === ANALYSIS_VERSION && entry.size === size && entry.mtimeMs === mtimeMs
}

export function defaultAppData(): AppData {
  return { version: 1, library: { folder: null, scannedAt: null, tracks: {} }, analysis: {} }
}

export function migrateAppData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return null
  const data = raw as AppData
  return {
    ...defaultAppData(),
    ...data,
    library: { ...defaultAppData().library, ...data.library },
    analysis: data.analysis ?? {}
  }
}

let store: JsonFile<AppData> | null = null

export function appData(): JsonFile<AppData> {
  if (!store) store = new JsonFile(join(app.getPath('userData'), 'mikseren-data.json'), defaultAppData, migrateAppData)
  return store
}

export function librarySnapshot(data: AppData): LibrarySnapshot {
  const tracks = Object.values(data.library.tracks)
  const analysis: Record<string, AnalysisSummary> = {}
  for (const t of tracks) {
    const entry = data.analysis[t.id]
    if (isAnalysisValid(entry, t.size, t.mtimeMs)) analysis[t.id] = { grid: entry.grid }
  }
  return { folder: data.library.folder, scannedAt: data.library.scannedAt, tracks, analysis }
}
