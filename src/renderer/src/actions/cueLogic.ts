import type { BeatGrid } from '@shared/analysis'
import { getEngine } from '../audio/AudioEngine'
import { nearestBeat, quantizedJump } from '../audio/loopMath'
import type { DeckId } from '../audio/types'
import { useAppStore, updateDeck } from '../state/store'

/** Cue-punktet til decken: det brukeren har satt, ellers første slag (eller starten). */
export function cuePosition(id: DeckId): number {
  const deck = useAppStore.getState().decks[id]
  if (deck.cue !== null) return deck.cue
  return deck.grid ? nearestBeat(0, deck.grid) : 0
}

/** Legger et punkt på nærmeste slag hvis vi vet hvor slagene er (kvantisering). */
export function quantize(position: number, grid: BeatGrid | null): number {
  return grid ? nearestBeat(position, grid) : position
}

/** Lagrer cue og hot cues for låten på decken. */
export function persistCues(id: DeckId): void {
  const deck = useAppStore.getState().decks[id]
  if (!deck.path) return
  void window.mikseren.saveCues(deck.path, { cue: deck.cue, hot: deck.hotCues })
}

/** Oppdaterer loop-tilstanden etter et hopp (et hopp ut av loopen avslutter den). */
export function syncLoopState(id: DeckId): void {
  updateDeck(id, { loop: getEngine().decks[id].loopRegion })
}

/**
 * Hopper til et punkt. Spiller decken og vi kjenner slagene, beholder vi
 * plassen i slaget, så låten fortsatt er i takt (og synket).
 */
export function jumpTo(id: DeckId, target: number): void {
  const deck = getEngine().decks[id]
  const grid = useAppStore.getState().decks[id].grid
  const position = deck.isPlaying && grid ? quantizedJump(target, deck.position, grid) : target
  deck.seek(position)
  syncLoopState(id)
}
