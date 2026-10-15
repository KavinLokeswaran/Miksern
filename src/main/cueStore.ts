import { emptyCues, parseCues, type TrackCues } from '../shared/cues'
import { appData } from './appData'
import { allowedPath } from './fileAccess'
import { trackId } from './library/scan'

/** Henter lagrede cues for en fil (tomme hvis ingen er lagret). */
export function getCues(path: unknown): TrackCues | null {
  const full = allowedPath(path)
  if (!full) return null
  return appData().get().cues[trackId(full)] ?? emptyCues()
}

export function saveCues(path: unknown, cues: unknown): boolean {
  const full = allowedPath(path)
  const parsed = parseCues(cues)
  if (!full || !parsed) return false
  const id = trackId(full)
  appData().update((d) => ({ ...d, cues: { ...d.cues, [id]: parsed } }))
  return true
}
