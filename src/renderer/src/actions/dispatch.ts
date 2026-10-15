import { getEngine } from '../audio/AudioEngine'
import { clamp01 } from '../audio/curves'
import type { DeckId } from '../audio/types'
import { useAppStore, updateDeck, updateMixer, type AppState } from '../state/store'
import { loadErrorMessage } from './messages'
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
      await loadTrack(action.deck, picked.path, picked.name)
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
    case 'deck/ended':
      updateDeck(action.deck, { isPlaying: false })
      break
    case 'deck/loaded':
      break
  }
  notify(action)
}

async function loadTrack(id: DeckId, path: string, name: string): Promise<void> {
  const engine = getEngine()
  const deck = engine.decks[id]
  deck.unload()
  updateDeck(id, { status: 'loading', title: name, artist: null, duration: 0, bpm: null, isPlaying: false, error: null })

  const file = await window.mikseren.readAudioFile(path)
  if (!file.ok) {
    updateDeck(id, { status: 'error', error: loadErrorMessage(file.reason) })
    return
  }
  try {
    // Kopier ut akkurat de bytene som tilhører fila.
    const bytes = file.data
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const buffer = await engine.decode(data)
    deck.load(buffer)
    updateDeck(id, { status: 'ready', duration: buffer.duration })
    void dispatch({ type: 'deck/loaded', deck: id })
  } catch {
    updateDeck(id, { status: 'error', error: loadErrorMessage('undecodable') })
  }
}

/** Kobler lydmotoren til tilstanden. Kalles én gang ved oppstart. */
export function initEngine(): void {
  const engine = getEngine()
  const { decks, mixer } = useAppStore.getState()
  for (const id of ['A', 'B'] as const) {
    engine.setChannelVolume(id, decks[id].volume)
    engine.decks[id].onEnded = () => void dispatch({ type: 'deck/ended', deck: id })
  }
  engine.setCrossfader(mixer.crossfader)
  engine.setMasterVolume(mixer.masterVolume)
}
