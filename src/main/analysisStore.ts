import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { ANALYSIS_VERSION, type TrackAnalysis } from '../shared/analysis'
import type { StoredAnalysis } from '../shared/ipc'
import { appData, isAnalysisValid } from './appData'
import { allowedPath } from './fileAccess'
import { trackId } from './library/scan'

function waveformFile(id: string): string {
  return join(app.getPath('userData'), 'waveforms', `${id}.bin`)
}

export async function getAnalysis(path: unknown): Promise<StoredAnalysis | null> {
  const full = allowedPath(path)
  if (!full) return null
  try {
    const info = await stat(full)
    const id = trackId(full)
    const entry = appData().get().analysis[id]
    if (!isAnalysisValid(entry, info.size, info.mtimeMs)) return null
    const bytes = await readFile(waveformFile(id))
    const { size: _size, mtimeMs: _mtime, ...analysis } = entry
    return { analysis, waveform: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) }
  } catch {
    return null
  }
}

function isTrackAnalysis(value: unknown): value is TrackAnalysis {
  if (!value || typeof value !== 'object') return false
  const a = value as TrackAnalysis
  const gridOk =
    a.grid === null ||
    (typeof a.grid === 'object' && Number.isFinite(a.grid.bpm) && a.grid.bpm > 0 && Number.isFinite(a.grid.firstBeat))
  return a.version === ANALYSIS_VERSION && gridOk && Number.isFinite(a.duration) && Number.isFinite(a.binsPerSecond)
}

export async function saveAnalysis(path: unknown, analysis: unknown, waveform: unknown): Promise<string | null> {
  const full = allowedPath(path)
  if (!full || !isTrackAnalysis(analysis) || !(waveform instanceof Uint8Array)) return null
  try {
    const info = await stat(full)
    const id = trackId(full)
    await mkdir(join(app.getPath('userData'), 'waveforms'), { recursive: true })
    await writeFile(waveformFile(id), waveform)
    const entry = {
      version: analysis.version,
      grid: analysis.grid,
      confidence: analysis.confidence,
      duration: analysis.duration,
      binsPerSecond: analysis.binsPerSecond,
      size: info.size,
      mtimeMs: info.mtimeMs
    }
    appData().update((d) => ({ ...d, analysis: { ...d.analysis, [id]: entry } }))
    return id
  } catch {
    return null
  }
}
