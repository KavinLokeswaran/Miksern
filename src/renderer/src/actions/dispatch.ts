import type { ScanResult } from '@shared/library'
import { getEngine } from '../audio/AudioEngine'
import { clamp01 } from '../audio/curves'
import { DECK_IDS, type DeckId } from '../audio/types'
import { nextSort } from '../library/filterSort'
import { findTrack, updateLibrary, useLibraryStore } from '../state/libraryStore'
import { useAppStore, updateDeck, updateMixer, type AppState } from '../state/store'
import { folderErrorMessage, loadErrorMessage, trackProblemMessage } from './messages'
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
      break
  }
  notify(action)
}

function applyScanResult(result: ScanResult): void {
  if (result.ok) {
    const { folder, tracks, scannedAt } = result.library
    updateLibrary({ folder, tracks, scannedAt, folderError: null, progress: { phase: 'idle' } })
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
  updateDeck(id, {
    status: 'loading',
    trackId: source.trackId,
    title: source.title,
    artist: source.artist,
    duration: 0,
    bpm: null,
    isPlaying: false,
    error: null
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
    updateDeck(id, { status: 'ready', duration: buffer.duration })
    void dispatch({ type: 'deck/loaded', deck: id, trackId: source.trackId })
  } catch {
    if (!isCurrent()) return
    updateDeck(id, { status: 'error', error: loadErrorMessage('undecodable') })
    if (source.trackId) markUnplayable(source.trackId)
  }
}

/** Husk at låten ikke kunne spilles, så den hoppes over i listen heretter. */
function markUnplayable(trackId: string): void {
  void window.mikseren.markTrackProblem(trackId, 'unreadable')
  updateLibrary({
    tracks: useLibraryStore.getState().tracks.map((t) => (t.id === trackId ? { ...t, status: 'unreadable' } : t))
  })
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
  updateLibrary({ ready: true, folder: library.folder, tracks: library.tracks, scannedAt: library.scannedAt })
  // Finn nye eller endrede filer siden sist.
  if (library.folder) void dispatch({ type: 'library/rescan' })
}
