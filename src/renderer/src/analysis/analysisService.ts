import { ANALYSIS_VERSION, type TrackAnalysis } from '@shared/analysis'
import type { StoredAnalysis } from '@shared/ipc'
import { AnalysisWorker } from './analysisClient'
import type { AnalysisOutput } from './core'
import { ANALYSIS_SAMPLE_RATE, audioBufferChannels, toAnalysisMono } from './prepare'

/** Egen worker for låter som lastes på en deck, så de ikke må vente på bakgrunnsanalysen. */
const deckWorker = new AnalysisWorker()
const backgroundWorker = new AnalysisWorker()

function toStored(output: AnalysisOutput): StoredAnalysis {
  const analysis: TrackAnalysis = {
    version: ANALYSIS_VERSION,
    grid: output.grid,
    confidence: output.confidence,
    duration: output.duration,
    binsPerSecond: output.binsPerSecond
  }
  return { analysis, waveform: output.waveform }
}

/** Analysen for en låt som er lastet på en deck: fra lageret hvis den finnes, ellers regnes den ut nå. */
export async function analyseDeckTrack(path: string, buffer: AudioBuffer): Promise<StoredAnalysis> {
  const cached = await window.mikseren.getAnalysis(path)
  if (cached) return cached
  const { mono, sampleRate } = toAnalysisMono(audioBufferChannels(buffer), buffer.sampleRate)
  const stored = toStored(await deckWorker.analyse(mono, sampleRate))
  // Send en kopi til lagring, så vi beholder bølgeformen her.
  await window.mikseren.saveAnalysis(path, stored.analysis, stored.waveform.slice())
  return stored
}

let decodeContext: OfflineAudioContext | null = null

/** Analyserer en fil i bakgrunnen og lagrer resultatet. Kaster hvis fila ikke kan leses eller spilles. */
export async function analyseFileInBackground(path: string): Promise<StoredAnalysis> {
  const file = await window.mikseren.readAudioFile(path)
  if (!file.ok) throw new Error(file.reason)
  const bytes = file.data
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  // En OfflineAudioContext med lav samplingsfrekvens pakker ut rett til det analysen trenger.
  decodeContext ??= new OfflineAudioContext(1, 1, ANALYSIS_SAMPLE_RATE)
  const buffer = await decodeContext.decodeAudioData(data)
  const { mono, sampleRate } = toAnalysisMono(audioBufferChannels(buffer), buffer.sampleRate)
  const stored = toStored(await backgroundWorker.analyse(mono, sampleRate))
  await window.mikseren.saveAnalysis(path, stored.analysis, stored.waveform)
  return stored
}
