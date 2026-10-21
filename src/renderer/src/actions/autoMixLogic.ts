import { getEngine } from '../audio/AudioEngine'
import { effectiveBpm } from '../audio/sync'
import type { DeckId } from '../audio/types'
import { useAppStore, updateMixer } from '../state/store'
import { onTick } from '../ui/ticker'
import { otherDeck } from './syncLogic'
import type { Action } from './types'

/**
 * Auto-overgang: flytter krysslideren mykt over til den andre decken på et antall slag,
 * og bytter bassen underveis (bassen på den gamle låten tas ut mens den nye kommer inn),
 * slik at de to basslinjene ikke kolliderer.
 */

/** Tempo som brukes hvis ingen av låtene har kjent tempo. */
const FALLBACK_BPM = 120
/** Bassen byttes i dette området av overgangen (andel av lengden). */
const BASS_SWAP_START = 0.4
const BASS_SWAP_END = 0.6

interface Run {
  from: DeckId
  to: DeckId
  startX: number
  endX: number
  /** Varighet i millisekunder. */
  duration: number
  startedAt: number
  /** Bassen på decksene før overgangen, så den kan settes tilbake. */
  fromLow: number
  toLow: number
  stop: () => void
}

let run: Run | null = null

type Dispatch = (action: Action) => Promise<void>

/** Hvor langt overgangen har kommet (0–1), eller null hvis ingen pågår. */
export function autoMixProgress(): number | null {
  if (!run) return null
  return Math.min((performance.now() - run.startedAt) / run.duration, 1)
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t)
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

/** Sekunder overgangen varer: `beats` slag i tempoet som spiller nå. */
export function autoMixSeconds(beats: number, bpm: number | null): number {
  return (beats * 60) / (bpm && bpm > 0 ? bpm : FALLBACK_BPM)
}

/**
 * Starter overgangen. Gir en forklaring tilbake hvis det ikke går.
 * Den nye låten startes (og synkes, hvis det går) om den ikke allerede spiller.
 */
export async function startAutoMix(dispatch: Dispatch): Promise<{ deck: DeckId; problem: string } | null> {
  cancelAutoMix()
  const engine = getEngine()
  const { mixer, decks } = useAppStore.getState()
  // Overgangen går mot den siden krysslideren ikke allerede står på.
  const to: DeckId = mixer.crossfader <= 0.5 ? 'B' : 'A'
  const from = otherDeck(to)
  if (decks[to].status !== 'ready') {
    return { deck: to, problem: `Last inn en låt på deck ${to} først, så kan appen mikse over til den.` }
  }
  if (!engine.decks[to].isPlaying) {
    const fromPlaying = engine.decks[from].isPlaying
    const canSync = fromPlaying && decks[to].grid && decks[from].grid
    if (canSync && !decks[to].synced) await dispatch({ type: 'deck/toggleSync', deck: to })
    await dispatch({ type: 'deck/play', deck: to })
  }
  const now = useAppStore.getState().decks
  const lead = engine.decks[from].isPlaying ? now[from] : now[to]
  const bpm = lead.bpm ? effectiveBpm(lead.bpm, lead.pitch) : null
  const startedAt = performance.now()
  run = {
    from,
    to,
    startX: mixer.crossfader,
    endX: to === 'B' ? 1 : 0,
    duration: autoMixSeconds(mixer.autoMixBeats, bpm) * 1000,
    startedAt,
    fromLow: now[from].eq.low,
    toLow: now[to].eq.low,
    stop: () => undefined
  }
  const current = run
  current.stop = onTick(() => step(current, dispatch))
  updateMixer({ autoMix: { target: to } })
  return null
}

function step(current: Run, dispatch: Dispatch): void {
  if (run !== current) return
  const t = clamp01((performance.now() - current.startedAt) / current.duration)
  const x = current.startX + (current.endX - current.startX) * smoothstep(t)
  void dispatch({ type: 'mixer/setCrossfader', value: x, auto: true })

  // Bassbytte: den gamle låten mister bassen, den nye får sin tilbake (hvis den var skrudd ned).
  const swap = smoothstep(clamp01((t - BASS_SWAP_START) / (BASS_SWAP_END - BASS_SWAP_START)))
  const fromLow = current.fromLow + (-1 - current.fromLow) * swap
  const toLow = current.toLow < 0 ? current.toLow * (1 - swap) : current.toLow
  const eq = useAppStore.getState().decks
  if (Math.abs(eq[current.from].eq.low - fromLow) > 0.004)
    void dispatch({ type: 'deck/setEq', deck: current.from, band: 'low', value: fromLow })
  if (Math.abs(eq[current.to].eq.low - toLow) > 0.004)
    void dispatch({ type: 'deck/setEq', deck: current.to, band: 'low', value: toLow })

  if (t >= 1) {
    finish(current)
    // Den gamle låten høres ikke lenger, så bassen kan settes tilbake til der den var.
    void dispatch({ type: 'deck/setEq', deck: current.from, band: 'low', value: current.fromLow })
  }
}

function finish(current: Run): void {
  current.stop()
  if (run === current) run = null
  updateMixer({ autoMix: null })
}

/** Avbryter en overgang som pågår (f.eks. fordi brukeren tok tak i krysslideren). */
export function cancelAutoMix(): void {
  if (run) finish(run)
}
