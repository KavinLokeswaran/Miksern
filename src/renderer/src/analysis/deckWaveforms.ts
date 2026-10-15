import type { DeckId } from '../audio/types'

/** Bølgeformen til låten på hver deck. Ligger utenfor React-tilstanden fordi den er stor. */
export interface DeckWaveform {
  data: Uint8Array
  binsPerSecond: number
  /** Antall punkter (data.length / 3). */
  bins: number
}

const waveforms: Record<DeckId, DeckWaveform | null> = { A: null, B: null }
const listeners = new Set<(deck: DeckId) => void>()

export function getDeckWaveform(deck: DeckId): DeckWaveform | null {
  return waveforms[deck]
}

export function setDeckWaveform(deck: DeckId, waveform: DeckWaveform | null): void {
  waveforms[deck] = waveform
  for (const listener of listeners) listener(deck)
}

export function onDeckWaveformChange(listener: (deck: DeckId) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
