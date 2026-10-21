import { getEngine } from '../audio/AudioEngine'
import { approach, NUDGE_BUTTON, nudgeFromSpin, scratchRate, turnsToSeconds } from '../audio/jogMath'
import { DECK_IDS, type DeckId } from '../audio/types'
import { onTick } from '../ui/ticker'

/**
 * Platene (jog wheels). Hånda gir mange små bevegelser i sekundet. De samles opp her,
 * og én gang per skjermbilde regnes farten ut og sendes til decken. Da blir lyden jevn
 * selv om musa ikke sender like mange hendelser hele tiden.
 */

type JogMode = 'scratch' | 'nudge'

interface JogState {
  mode: JogMode | null
  /** Under scratch: der hånda har dratt platen til (sekunder i låten). */
  target: number
  /** Kant- og hjulbevegelse siden forrige bilde (turer). */
  pendingTurns: number
  /** Skyv fra kanten/hjulet akkurat nå (0 = ingen). */
  bend: number
  /** Skyv-knappene: -1, 0 eller 1. */
  button: -1 | 0 | 1
}

/** Hvor mykt skyvet kommer og går (sekunder). */
const BEND_SMOOTHING = 0.08

const jogs: Record<DeckId, JogState> = {
  A: { mode: null, target: 0, pendingTurns: 0, bend: 0, button: 0 },
  B: { mode: null, target: 0, pendingTurns: 0, bend: 0, button: 0 }
}

let stopTick: (() => void) | null = null
let lastTick = 0

export function jogStart(id: DeckId, mode: JogMode): void {
  const deck = getEngine().decks[id]
  if (!deck.isLoaded) return
  const jog = jogs[id]
  if (jog.mode) jogEnd(id)
  // Står decken stille, er det bare scratch som gir mening (som på en ekte platespiller).
  jog.mode = deck.isPlaying ? mode : 'scratch'
  jog.pendingTurns = 0
  if (jog.mode === 'scratch') {
    deck.beginScratch()
    jog.target = deck.position
  }
  ensureRunning()
}

/**
 * Platen dreies. Gir false hvis bevegelsen ikke ble brukt (hjulet over en deck som står stille),
 * så dispatch kan flytte posisjonen i stedet.
 */
export function jogMove(id: DeckId, turns: number): boolean {
  const deck = getEngine().decks[id]
  if (!deck.isLoaded) return false
  const jog = jogs[id]
  if (jog.mode === 'scratch') {
    jog.target = Math.min(Math.max(jog.target + turnsToSeconds(turns), 0), deck.duration)
  } else if (jog.mode === 'nudge' || deck.isPlaying) {
    jog.pendingTurns += turns
  } else {
    return false
  }
  ensureRunning()
  return true
}

export function jogEnd(id: DeckId): void {
  const jog = jogs[id]
  if (jog.mode === 'scratch') getEngine().decks[id].endScratch()
  jog.mode = null
  jog.pendingTurns = 0
}

export function setNudgeButton(id: DeckId, direction: -1 | 0 | 1): void {
  jogs[id].button = direction
  if (direction !== 0) ensureRunning()
}

export function isTouching(id: DeckId): boolean {
  return jogs[id].mode !== null
}

function ensureRunning(): void {
  if (stopTick) return
  lastTick = performance.now()
  stopTick = onTick(tick)
}

function tick(now: number): void {
  const engine = getEngine()
  const dt = Math.min(Math.max((now - lastTick) / 1000, 0.001), 0.1)
  lastTick = now
  let busy = false
  for (const id of DECK_IDS) {
    const jog = jogs[id]
    const deck = engine.decks[id]
    if (jog.mode === 'scratch') {
      deck.setScratchRate(scratchRate(jog.target, deck.position))
      busy = true
      continue
    }
    const spin = jog.pendingTurns / dt
    jog.pendingTurns = 0
    jog.bend = approach(jog.bend, nudgeFromSpin(spin), dt, BEND_SMOOTHING)
    if (Math.abs(jog.bend) < 1e-4 && spin === 0) jog.bend = 0
    deck.setBend(1 + jog.bend + jog.button * NUDGE_BUTTON)
    if (jog.mode || jog.bend !== 0 || jog.button !== 0) busy = true
  }
  if (!busy && stopTick) {
    stopTick()
    stopTick = null
  }
}
