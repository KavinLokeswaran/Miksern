import type { ScanResult } from '@shared/library'
import { analyseDeckTrack, waveformForBuffer } from '../analysis/analysisService'
import { startBackgroundAnalysis } from '../analysis/backgroundQueue'
import { setDeckWaveform } from '../analysis/deckWaveforms'
import { getEngine } from '../audio/AudioEngine'
import { clamp01 } from '../audio/curves'
import { effectiveBpm } from '../audio/sync'
import { loopAt, resizeLoop } from '../audio/loopMath'
import { DECK_IDS, type DeckId } from '../audio/types'
import { nextSort } from '../library/filterSort'
import { findTrack, markTrackUnplayable, setTrackAnalysis, updateLibrary, useLibraryStore } from '../state/libraryStore'
import { useAppStore, updateDeck, updateMixer, updateRecording, type AppState } from '../state/store'
import { cuePosition, jumpTo, persistCues, quantize, syncLoopState } from './cueLogic'
import { handleLearnAction } from '../learn/learnController'
import { PRACTICE_BEATS } from '../practice/arrangement'
import { getPracticeBeat } from '../practice/practiceBeats'
import { patchSettings } from '../state/settingsStore'
import { applyRecordingResult, getRecorder } from './recordingLogic'
import { folderErrorMessage, loadErrorMessage, trackProblemMessage } from './messages'
import {
  applyPitch,
  clampPitch,
  otherDeck,
  realignFollower,
  showNotice,
  syncPhase,
  syncProblem,
  syncTempo
} from './syncLogic'
import type { Action } from './types'

const clampUnit = (x: number): number => Math.max(-1, Math.min(1, x))

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
      realignFollower(action.deck)
      break
    }
    case 'deck/pause':
      engine.decks[action.deck].pause()
      updateDeck(action.deck, { isPlaying: false })
      break
    case 'deck/seek':
      engine.decks[action.deck].seek(action.seconds)
      syncLoopState(action.deck)
      realignFollower(action.deck)
      break
    case 'deck/cue': {
      const id = action.deck
      const deck = engine.decks[id]
      if (!deck.isLoaded) return
      if (deck.isPlaying) {
        // Spiller den: tilbake til cue-punktet og stopp.
        deck.pause()
        deck.seek(cuePosition(id))
        updateDeck(id, { isPlaying: false })
      } else {
        // Står den stille: sett cue-punktet her (på nærmeste slag).
        const cue = quantize(deck.position, useAppStore.getState().decks[id].grid)
        deck.seek(cue)
        updateDeck(id, { cue })
        persistCues(id)
      }
      syncLoopState(id)
      break
    }
    case 'deck/hotCue': {
      const id = action.deck
      const state = useAppStore.getState().decks[id]
      if (!engine.decks[id].isLoaded || action.index < 0 || action.index >= state.hotCues.length) return
      const existing = state.hotCues[action.index]
      if (existing === null) {
        const hotCues = [...state.hotCues]
        hotCues[action.index] = quantize(engine.decks[id].position, state.grid)
        updateDeck(id, { hotCues })
        persistCues(id)
      } else {
        jumpTo(id, existing)
      }
      break
    }
    case 'deck/deleteHotCue': {
      const id = action.deck
      const hotCues = [...useAppStore.getState().decks[id].hotCues]
      if (hotCues[action.index] === undefined) return
      hotCues[action.index] = null
      updateDeck(id, { hotCues })
      persistCues(id)
      break
    }
    case 'deck/loop': {
      const id = action.deck
      const state = useAppStore.getState().decks[id]
      const deck = engine.decks[id]
      if (!deck.isLoaded) return
      if (!state.grid) {
        showNotice(id, 'Loops trenger at appen vet hvor slagene er, og det fant den ikke i denne låten.')
        return
      }
      const current = deck.loopRegion
      deck.setLoop(
        current ? resizeLoop(current, state.grid, action.beats) : loopAt(deck.position, state.grid, action.beats)
      )
      syncLoopState(id)
      break
    }
    case 'deck/exitLoop':
      engine.decks[action.deck].clearLoop()
      syncLoopState(action.deck)
      break
    case 'deck/toggleFx': {
      const id = action.deck
      const fx = useAppStore.getState().decks[id].fx
      const next = { ...fx[action.fx], on: !fx[action.fx].on }
      engine.setFx(id, action.fx, next.on, next.amount)
      updateDeck(id, { fx: { ...fx, [action.fx]: next } })
      break
    }
    case 'deck/setFxAmount': {
      const id = action.deck
      const fx = useAppStore.getState().decks[id].fx
      const next = { ...fx[action.fx], amount: clamp01(action.value) }
      engine.setFx(id, action.fx, next.on, next.amount)
      updateDeck(id, { fx: { ...fx, [action.fx]: next } })
      break
    }
    case 'deck/showPanel':
      updateDeck(action.deck, { panel: action.panel })
      break
    case 'recording/start': {
      const status = useAppStore.getState().recording.status
      if (status !== 'idle') return
      updateRecording({ status: 'starting', error: null, savedPath: null })
      await engine.resume()
      const ok = await getRecorder(() => void dispatch({ type: 'recording/stop' }))
        .start()
        .catch(() => false)
      updateRecording(
        ok
          ? { status: 'recording', startedAt: performance.now() }
          : { status: 'idle', error: 'Klarte ikke å starte opptaket.' }
      )
      if (!ok) return
      break
    }
    case 'recording/stop': {
      if (useAppStore.getState().recording.status !== 'recording') return
      updateRecording({ status: 'stopping' })
      await getRecorder(() => undefined).stop()
      applyRecordingResult(await window.mikseren.recordingStop())
      break
    }
    case 'recording/save':
      if (useAppStore.getState().recording.status !== 'unsaved') return
      applyRecordingResult(await window.mikseren.recordingSave())
      break
    case 'recording/discard':
      await window.mikseren.recordingDiscard()
      updateRecording({ status: 'idle', unsavedSeconds: 0, error: null })
      break
    case 'deck/setVolume': {
      const value = clamp01(action.value)
      engine.setChannelVolume(action.deck, value)
      updateDeck(action.deck, { volume: value })
      break
    }
    case 'deck/setTrim': {
      const value = clampUnit(action.value)
      engine.setTrim(action.deck, value)
      updateDeck(action.deck, { trim: value })
      break
    }
    case 'deck/setEq': {
      const value = clampUnit(action.value)
      engine.setEq(action.deck, action.band, value)
      updateDeck(action.deck, { eq: { ...useAppStore.getState().decks[action.deck].eq, [action.band]: value } })
      break
    }
    case 'deck/setFilter': {
      const value = clampUnit(action.value)
      engine.setFilter(action.deck, value)
      updateDeck(action.deck, { filter: value })
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
    case 'practice/load':
      await loadPractice(action.deck, action.beat, action.play ?? false)
      break
    case 'settings/setAdvanced':
      patchSettings({ advancedMode: action.value })
      break
    case 'learn/start':
    case 'learn/next':
    case 'learn/back':
    case 'learn/skip':
    case 'learn/exit':
    case 'learn/choosePractice':
    case 'learn/menu':
    case 'learn/dismissToast':
      handleLearnAction(action)
      break
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

/** Gjør decken klar for en ny låt. Gir en funksjon som sier om denne lastingen fortsatt gjelder. */
function beginLoad(
  id: DeckId,
  source: { trackId: string | null; path: string | null; title: string; artist: string | null }
): () => boolean {
  const ticket = ++loadCounter[id]
  getEngine().decks[id].unload()
  setDeckWaveform(id, null)
  // Ny låt: Synk gjelder ikke lenger, verken for denne decken eller en deck som fulgte den.
  updateDeck(otherDeck(id), { synced: false })
  updateDeck(id, {
    status: 'loading',
    trackId: source.trackId,
    path: source.path,
    cue: null,
    hotCues: initialHotCues(),
    loop: null,
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
  return () => loadCounter[id] === ticket
}

async function loadTrack(id: DeckId, source: TrackSource): Promise<void> {
  const engine = getEngine()
  const deck = engine.decks[id]
  const isCurrent = beginLoad(id, source)

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
    const cues = await window.mikseren.getCues(source.path)
    if (!isCurrent()) return
    if (cues) updateDeck(id, { cue: cues.cue, hotCues: cues.hot })
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

/** Laster en øvelses-beat. Tempo og beatgrid er kjent, så bare bølgeformen må regnes ut. */
async function loadPractice(id: DeckId, beat: 1 | 2, play: boolean): Promise<void> {
  const spec = PRACTICE_BEATS[beat]
  const isCurrent = beginLoad(id, {
    trackId: `practice-${beat}`,
    path: null,
    title: spec.title,
    artist: 'Mikseren (øvelse)'
  })
  try {
    const buffer = await getPracticeBeat(beat)
    if (!isCurrent()) return
    getEngine().decks[id].load(buffer)
    const grid = { bpm: spec.bpm, firstBeat: 0 }
    // Tempoet er kjent, så Synk og loops virker med en gang. Bølgeformen kommer straks etter.
    updateDeck(id, { status: 'ready', duration: buffer.duration, bpm: spec.bpm, grid, analysis: 'done' })
    void dispatch({ type: 'deck/loaded', deck: id, trackId: null })
    if (play) await dispatch({ type: 'deck/play', deck: id })
    const waveform = await waveformForBuffer(buffer)
    if (!isCurrent()) return
    setDeckWaveform(id, waveform)
    updateDeck(id, { analysis: 'done' })
    void dispatch({ type: 'deck/analysed', deck: id })
  } catch (err) {
    console.error('Øvelses-beaten feilet', err)
    if (isCurrent()) updateDeck(id, { status: 'error', error: 'Klarte ikke å lage øvelses-beaten. Prøv igjen.' })
  }
}

/** Finner BPM, beatgrid og bølgeform for låten på decken (fra lageret, eller regner ut nå). */
async function analyseOnDeck(
  id: DeckId,
  source: TrackSource,
  buffer: AudioBuffer,
  isCurrent: () => boolean
): Promise<void> {
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

function initialHotCues(): (number | null)[] {
  return useAppStore.getState().decks.A.hotCues.map(() => null)
}

/** Kobler lydmotoren til tilstanden. Kalles én gang ved oppstart. */
export function initEngine(): void {
  const engine = getEngine()
  const { decks, mixer } = useAppStore.getState()
  for (const id of DECK_IDS) {
    engine.setChannelVolume(id, decks[id].volume)
    engine.setTrim(id, decks[id].trim)
    engine.setFilter(id, decks[id].filter)
    for (const band of ['low', 'mid', 'high'] as const) engine.setEq(id, band, decks[id].eq[band])
    engine.decks[id].onEnded = () => void dispatch({ type: 'deck/ended', deck: id })
  }
  engine.setCrossfader(mixer.crossfader)
  engine.setMasterVolume(mixer.masterVolume)
  // Ekkoet følger tempoet på decken (låtens BPM og tempo-slideren).
  useAppStore.subscribe((state, prev) => {
    for (const id of DECK_IDS) {
      const d = state.decks[id]
      const p = prev.decks[id]
      if (d.bpm !== p.bpm || d.pitch !== p.pitch) engine.setTempo(id, d.bpm ? effectiveBpm(d.bpm, d.pitch) : null)
    }
  })
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
