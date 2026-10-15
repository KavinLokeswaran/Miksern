import type { BeatGrid } from '@shared/analysis'
import { beatsAt } from './sync'

/** Loop-lengdene appen tilbyr, i slag. */
export const LOOP_SIZES = [0.5, 1, 2, 4, 8, 16] as const
export type LoopSize = (typeof LOOP_SIZES)[number]

export interface LoopRegion {
  start: number
  end: number
  /** Lengde i slag. */
  beats: number
}

function beatTime(beats: number, grid: BeatGrid): number {
  return grid.firstBeat + (beats * 60) / grid.bpm
}

/** Nærmeste slag til en posisjon (aldri før starten av låten). */
export function nearestBeat(position: number, grid: BeatGrid): number {
  let t = beatTime(Math.round(beatsAt(position, grid)), grid)
  if (t < 0) t += 60 / grid.bpm
  return t
}

/**
 * En loop som starter på slaget du er på (eller nettopp passerte), og er `beats` slag lang.
 * Halve slag starter på nærmeste halve slag. Låst til beatgridet, så den alltid er i takt.
 */
export function loopAt(position: number, grid: BeatGrid, beats: number): LoopRegion {
  const step = Math.min(1, beats)
  // Litt slingringsmonn, så et trykk rett før slaget teller som slaget.
  const startBeats = Math.floor(beatsAt(position, grid) / step + 0.02) * step
  let start = beatTime(startBeats, grid)
  if (start < 0) start += step * (60 / grid.bpm) * Math.ceil(-start / (step * (60 / grid.bpm)))
  return { start, end: start + (beats * 60) / grid.bpm, beats }
}

/** Ny lengde på en loop som allerede går. Starten beholdes. */
export function resizeLoop(loop: LoopRegion, grid: BeatGrid, beats: number): LoopRegion {
  return { start: loop.start, end: loop.start + (beats * 60) / grid.bpm, beats }
}

/**
 * Hvor avspillingen faktisk er når en loop er aktiv. `raw` er posisjonen som om
 * det ikke var noen loop. Når den har passert slutten, går den rundt til starten.
 */
export function wrapInLoop(raw: number, loop: LoopRegion | null): number {
  if (!loop || raw < loop.end) return raw
  const length = loop.end - loop.start
  if (length <= 0) return raw
  return loop.start + ((raw - loop.start) % length)
}

/**
 * Hopp til `target` (f.eks. en hot cue) uten å komme ut av takt: vi tar med oss
 * hvor langt inn i slaget vi er, så slagene fortsatt ligger der de lå.
 */
export function quantizedJump(target: number, current: number, grid: BeatGrid): number {
  const beatSeconds = 60 / grid.bpm
  const into = beatsAt(current, grid) - Math.floor(beatsAt(current, grid))
  const targetBeat = nearestBeat(target, grid)
  return targetBeat + into * beatSeconds
}

/** Lesbar loop-lengde: «1/2», «1», «16». */
export function loopLabel(beats: number): string {
  return beats === 0.5 ? '1/2' : String(beats)
}
