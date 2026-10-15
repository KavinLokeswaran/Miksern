import { create } from 'zustand'
import { DECK_IDS, type DeckId } from '../audio/types'

export type DeckStatus = 'empty' | 'loading' | 'ready' | 'error'

export interface DeckState {
  status: DeckStatus
  title: string | null
  artist: string | null
  /** Lengde i sekunder. */
  duration: number
  bpm: number | null
  isPlaying: boolean
  /** Volumfader, 0–1. */
  volume: number
  /** Vennlig feilmelding hvis noe gikk galt. */
  error: string | null
}

export interface MixerState {
  /** 0 = bare A, 1 = bare B. */
  crossfader: number
  /** 0–1. */
  masterVolume: number
}

export interface AppState {
  decks: Record<DeckId, DeckState>
  mixer: MixerState
}

export const initialDeckState: DeckState = {
  status: 'empty',
  title: null,
  artist: null,
  duration: 0,
  bpm: null,
  isPlaying: false,
  volume: 0.8,
  error: null
}

export function createInitialState(): AppState {
  const decks = {} as Record<DeckId, DeckState>
  for (const id of DECK_IDS) decks[id] = { ...initialDeckState }
  return { decks, mixer: { crossfader: 0.5, masterVolume: 0.8 } }
}

/**
 * Appens tilstand. Endres bare via dispatch() i actions/dispatch.ts,
 * aldri direkte fra komponentene.
 */
export const useAppStore = create<AppState>()(() => createInitialState())

export function updateDeck(id: DeckId, patch: Partial<DeckState>): void {
  useAppStore.setState((s) => ({ decks: { ...s.decks, [id]: { ...s.decks[id], ...patch } } }))
}

export function updateMixer(patch: Partial<MixerState>): void {
  useAppStore.setState((s) => ({ mixer: { ...s.mixer, ...patch } }))
}
