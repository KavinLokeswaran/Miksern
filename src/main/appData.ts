import { join } from 'node:path'
import { app } from 'electron'
import type { LibrarySnapshot, TrackInfo } from '../shared/library'
import { JsonFile } from './persist'

/** Alt appen husker, lagret i én JSON-fil i appens datamappe. */
export interface AppData {
  version: 1
  library: {
    folder: string | null
    scannedAt: number | null
    tracks: Record<string, TrackInfo>
  }
}

export function defaultAppData(): AppData {
  return { version: 1, library: { folder: null, scannedAt: null, tracks: {} } }
}

export function migrateAppData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return null
  const data = raw as AppData
  return { ...defaultAppData(), ...data, library: { ...defaultAppData().library, ...data.library } }
}

let store: JsonFile<AppData> | null = null

export function appData(): JsonFile<AppData> {
  if (!store) store = new JsonFile(join(app.getPath('userData'), 'mikseren-data.json'), defaultAppData, migrateAppData)
  return store
}

export function librarySnapshot(data: AppData): LibrarySnapshot {
  return {
    folder: data.library.folder,
    scannedAt: data.library.scannedAt,
    tracks: Object.values(data.library.tracks)
  }
}
