import { create } from 'zustand'
import type { BeatGrid } from '@shared/analysis'
import { HOT_CUE_COUNT } from '@shared/cues'
import { FX_KINDS, type FxKind } from '../audio/fxMath'
import type { LoopRegion } from '../audio/loopMath'
import type { EqBand } from '../audio/toneMath'
import { DECK_IDS, type DeckId } from '../audio/types'

export type DeckStatus = 'empty' | 'loading' | 'ready' | 'error'
export type AnalysisStatus = 'none' | 'running' | 'done'
/** Fanene nederst på decken. */
export type DeckPanelKind = 'hotcues' | 'loops' | 'fx'

export interface FxState {
  on: boolean
  /** Mengde, 0–1. */
  amount: number
}

export interface DeckState {
  status: DeckStatus
  /** ID i biblioteket, eller null for filer åpnet med «Åpne fil». */
  trackId: string | null
  /** Filstien til låten (brukes for å lagre cues). */
  path: string | null
  title: string | null
  artist: string | null
  /** Lengde i sekunder. */
  duration: number
  /** Låtens eget tempo (uten tempo-slideren), fra analysen eller filens tagger. */
  bpm: number | null
  /** Beatgrid fra analysen. Trengs for Synk og fasemåler. */
  grid: BeatGrid | null
  analysis: AnalysisStatus
  /** Tempo-slideren, som brøk: 0.05 = 5 % raskere. */
  pitch: number
  /** Følger tempoet og slagene til den andre decken. */
  synced: boolean
  isPlaying: boolean
  /** Volumfader, 0–1. */
  volume: number
  /** Trim (gain), -1 … 1. 0 = uendret. */
  trim: number
  /** EQ per bånd, -1 … 1. 0 = uendret, -1 = kill. */
  eq: Record<EqBand, number>
  /** Filterknotten, -1 (lavpass) … 0 (av) … 1 (høypass). */
  filter: number
  /** Vennlig feilmelding hvis noe gikk galt. */
  error: string | null
  /** Kort beskjed som forsvinner av seg selv (f.eks. hvorfor Synk ikke gikk). */
  notice: string | null
  /** Cue-punktet (sekunder), eller null for starten av låten. */
  cue: number | null
  /** Hot cues 1–4 (sekunder), null = tom. */
  hotCues: (number | null)[]
  /** Aktiv loop, eller null. */
  loop: LoopRegion | null
  fx: Record<FxKind, FxState>
  /** Hvilken fane som vises nederst på decken. */
  panel: DeckPanelKind
}

export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'stopping' | 'unsaved'

export interface RecordingState {
  status: RecordingStatus
  /** performance.now() da opptaket startet. */
  startedAt: number | null
  /** Lengden på et opptak som venter på å bli lagret (sekunder). */
  unsavedSeconds: number
  /** Hvor siste opptak ble lagret. */
  savedPath: string | null
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
  recording: RecordingState
}

export const initialDeckState: DeckState = {
  status: 'empty',
  trackId: null,
  title: null,
  artist: null,
  duration: 0,
  bpm: null,
  grid: null,
  analysis: 'none',
  pitch: 0,
  synced: false,
  isPlaying: false,
  volume: 0.8,
  trim: 0,
  eq: { low: 0, mid: 0, high: 0 },
  filter: 0,
  error: null,
  notice: null,
  path: null,
  cue: null,
  hotCues: Array.from({ length: HOT_CUE_COUNT }, () => null),
  loop: null,
  fx: Object.fromEntries(FX_KINDS.map((k) => [k, { on: false, amount: 0.5 }])) as Record<FxKind, FxState>,
  panel: 'hotcues'
}

export function createInitialState(): AppState {
  const decks = {} as Record<DeckId, DeckState>
  for (const id of DECK_IDS) decks[id] = { ...initialDeckState }
  return {
    decks,
    mixer: { crossfader: 0.5, masterVolume: 0.8 },
    recording: { status: 'idle', startedAt: null, unsavedSeconds: 0, savedPath: null, error: null }
  }
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

export function updateRecording(patch: Partial<RecordingState>): void {
  useAppStore.setState((s) => ({ recording: { ...s.recording, ...patch } }))
}
