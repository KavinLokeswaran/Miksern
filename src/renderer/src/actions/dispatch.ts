import type { ScanResult } from '@shared/library'
import { analyseDeckTrack } from '../analysis/analysisService'
import { startBackgroundAnalysis } from '../analysis/backgroundQueue'
import { setDeckWaveform } from '../analysis/deckWaveforms'
import { getEngine } from '../audio/AudioEngine'
import { clamp01 } from '../audio/curves'
import { DECK_IDS, type DeckId } from '../audio/types'
import { nextSort } from '../library/filterSort'
import { findTrack, markTrackUnplayable, setTrackAnalysis, updateLibrary, useLibraryStore } from '../state/libraryStore'
import { useAppStore, updateDeck, updateMixer, type AppState } from '../state/store'
import { folderErrorMessage, loadErrorMessage, trackProblemMessage } from './messages'
import { applyPitch, clampPitch, otherDeck, showNotice, syncPhase, syncProblem, syncTempo } from './syncLogic'
import type { Action } from './types'

export type ActionListener = (action: Action, state: AppState) => void

const listeners = new Set<ActionListener>()

/** Lytt på alle handlinger (brukes av intro, tips og senere MIDI-lys). */
export function onAction(listener: ActionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(action: Action): void {
  const state = useAppStore.getState()
  for (const listener of listeners) {
    try {
      listener(action, state)
    } catch (err) {
      console.error('Feil i action-lytter', err)
    }
  }
}

/** Det ene stedet alle handlinger går gjennom. */
export async function dispatch(action: Action): Promise<void> {
  const engine = getEngine()
  switch (action.type) {
    case 'deck/openFile': {
      const picked = await window.mikseren.pickAudioFile()
      if (!picked) return
      await loadTrack(action.deck, { path: picked.path, title: picked.name, artist: null, trackId: null })
      break
    }
    case 'deck/loadTrack': {
      const track = findTrack(action.trackId)
      if (!track) return
      if (track.status !== 'ok') {
        updateDeck(action.deck, { error: trackProblemMessage(track.status) })
        return
      }
      await loadTrack(action.deck, { path: track.path, title: track.title, artist: track.artist, trackId: track.id })
      break
    }
    case 'deck/togglePlay': {
      const playing = useAppStore.getState().decks[action.deck].isPlaying
      return dispatch({ type: playing ? 'deck/pause' : 'deck/play', deck: action.deck })
    }
    case 'deck/play': {
      const deck = engine.decks[action.deck]
      if (!deck.isLoaded) return
      await engine.resume()
      // Er decken synket, starter den med slagene oppå den andre decken.
      if (useAppStore.getState().decks[action.deck].synced) syncPhase(action.deck)
      deck.play()
      updateDeck(action.deck, { isPlaying: true })
      break
    }
    case 'deck/pause':
      engine.decks[action.deck].pause()
      updateDeck(action.deck, { isPlaying: false })
      break
    case 'deck/seek':
      engine.decks[action.deck].seek(action.seconds)
      break
    case 'deck/setVolume': {
      const value = clamp01(action.value)
      engine.setChannelVolume(action.deck, value)
      updateDeck(action.deck, { volume: value })
      break
    }
    case 'deck/setPitch': {
      const id = action.deck
      // Flytter du tempo-slideren selv, slås Synk av for denne decken.
      updateDeck(id, { synced: false })
      applyPitch(id, clampPitch(action.value))
      // Følger den andre decken denne, må den følge med.
      const follower = otherDeck(id)
      if (useAppStore.getState().decks[follower].synced) syncTempo(follower)
      break
    }
    case 'deck/toggleSync': {
      const id = action.deck
      if (useAppStore.getState().decks[id].synced) {
        updateDeck(id, { synced: false })
        break
      }
      const problem = syncProblem(id)
      if (problem) {
        showNotice(id, problem)
        return
      }
      if (!syncTempo(id)) return
      // Bare én deck kan følge den andre.
      updateDeck(otherDeck(id), { synced: false })
      updateDeck(id, { synced: true })
      if (engine.decks[id].isPlaying) syncPhase(id)
      break
    }
    case 'mixer/setCrossfader': {
      const value = clamp01(action.value)
      engine.setCrossfader(value)
      updateMixer({ crossfader: value })
      break
    }
    case 'mixer/setMasterVolume': {
      const value = clamp01(action.value)
      engine.setMasterVolume(value)
      updateMixer({ masterVolume: value })
      break
    }
    case 'library/pickFolder': {
      const result = await window.mikseren.pickLibraryFolder()
      if (!result) return
      applyScanResult(result)
      break
    }
    case 'library/rescan':
      applyScanResult(await window.mikseren.rescanLibrary())
      break
    case 'library/setSearch':
      updateLibrary({ search: action.query })
      break
    case 'library/sortBy':
      updateLibrary({ sort: nextSort(useLibraryStore.getState().sort, action.key) })
      break
    case 'deck/ended':
      updateDeck(action.deck, { isPlaying: false })
      break
    case 'deck/loaded':
    case 'deck/analysed':
      break
  }
  notify(action)
}

function applyScanResult(result: ScanResult): void {
  if (result.ok) {
    const { folder, tracks, scannedAt, analysis } = result.library
    updateLibrary({ folder, tracks, scannedAt, analysis, folderError: null, progress: { phase: 'idle' } })
    startBackgroundAnalysis()
  } else {
    updateLibrary({ folderError: folderErrorMessage(result.reason), progress: { phase: 'idle' } })
  }
}

interface TrackSource {
  path: string
  title: string
  artist: string | null
  trackId: string | null
}

/** Teller lastinger, så en treg, gammel lasting ikke overskriver en nyere. */
const loadCounter: Record<DeckId, number> = { A: 0, B: 0 }

async function loadTrack(id: DeckId, source: TrackSource): Promise<void> {
  const engine = getEngine()
  const deck = engine.decks[id]
  const ticket = ++loadCounter[id]
  const isCurrent = (): boolean => loadCounter[id] === ticket

  deck.unload()
  setDeckWaveform(id, null)
  // Ny låt: Synk gjelder ikke lenger, verken for denne decken eller en deck som fulgte den.
  updateDeck(otherDeck(id), { synced: false })
  updateDeck(id, {
    status: 'loading',
    trackId: source.trackId,
    title: source.title,
    artist: source.artist,
    duration: 0,
    bpm: null,
    grid: null,
    analysis: 'none',
    synced: false,
    isPlaying: false,
    error: null,
    notice: null
  })

  const file = await window.mikseren.readAudioFile(source.path)
  if (!isCurrent()) return
  if (!file.ok) {
    updateDeck(id, { status: 'error', error: loadErrorMessage(file.reason) })
    return
  }
  try {
    // Kopier ut akkurat de bytene som tilhører fila.
    const bytes = file.data
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const buffer = await engine.decode(data)
    if (!isCurrent()) return
    deck.load(buffer)
    const tagBpm = source.trackId ? (findTrack(source.trackId)?.tagBpm ?? null) : null
    updateDeck(id, { status: 'ready', duration: buffer.duration, bpm: tagBpm, analysis: 'running' })
    void dispatch({ type: 'deck/loaded', deck: id, trackId: source.trackId })
    void analyseOnDeck(id, source, buffer, isCurrent)
  } catch {
    if (!isCurrent()) return
    updateDeck(id, { status: 'error', error: loadErrorMessage('undecodable') })
    if (source.trackId) markTrackUnplayable(source.trackId)
  }
}

/** Finner BPM, beatgrid og bølgeform for låten på decken (fra lageret, eller regner ut nå). */
async function analyseOnDeck(id: DeckId, source: TrackSource, buffer: AudioBuffer, isCurrent: () => boolean): Promise<void> {
  try {
    const { analysis, waveform } = await analyseDeckTrack(source.path, buffer)
    if (!isCurrent()) return
    setDeckWaveform(id, { data: waveform, binsPerSecond: analysis.binsPerSecond, bins: waveform.length / 3 })
    const fallback = useAppStore.getState().decks[id].bpm
    updateDeck(id, { grid: analysis.grid, bpm: analysis.grid?.bpm ?? fallback, analysis: 'done' })
    if (source.trackId) setTrackAnalysis(source.trackId, { grid: analysis.grid })
    void dispatch({ type: 'deck/analysed', deck: id })
  } catch (err) {
    console.error('Analysen feilet', err)
    if (isCurrent()) updateDeck(id, { analysis: 'done' })
  }
}

/** Kobler lydmotoren til tilstanden. Kalles én gang ved oppstart. */
export function initEngine(): void {
  const engine = getEngine()
  const { decks, mixer } = useAppStore.getState()
  for (const id of DECK_IDS) {
    engine.setChannelVolume(id, decks[id].volume)
    engine.decks[id].onEnded = () => void dispatch({ type: 'deck/ended', deck: id })
  }
  engine.setCrossfader(mixer.crossfader)
  engine.setMasterVolume(mixer.masterVolume)
}

/** Henter biblioteket fra disk og skanner på nytt i bakgrunnen. Kalles én gang ved oppstart. */
export async function initLibrary(): Promise<void> {
  window.mikseren.onScanProgress((progress) => updateLibrary({ progress }))
  const library = await window.mikseren.getLibrary()
  updateLibrary({
    ready: true,
    folder: library.folder,
    tracks: library.tracks,
    analysis: library.analysis,
    scannedAt: library.scannedAt
  })
  // Finn nye eller endrede filer siden sist. Analysen starter når skanningen er ferdig.
  if (library.folder) void dispatch({ type: 'library/rescan' })
}
