import type { BeatGrid } from '@shared/analysis'

/**
 * Matte for tempo, Synk og fasemåler. Ren logikk, så den kan testes.
 * "Pitch" er tempoendringen som brøk: 0.05 = 5 % raskere.
 */

/** Tempo-slideren går fra -8 % til +8 %. */
export const TEMPO_RANGE = 0.08

/** Under denne forskjellen (i slag) regnes decksene som i takt. */
export const IN_PHASE_BEATS = 0.03

export function effectiveBpm(bpm: number, pitch: number): number {
  return bpm * (1 + pitch)
}

/** Hvor mange slag som har gått siden rutenettets første slag (kan være negativt). */
export function beatsAt(position: number, grid: BeatGrid): number {
  return ((position - grid.firstBeat) * grid.bpm) / 60
}

function frac(x: number): number {
  return x - Math.floor(x)
}

/** Gjør om en forskjell i slag til området -0,5 … 0,5. */
export function wrapHalf(x: number): number {
  return frac(x + 0.5) - 0.5
}

/**
 * Finner pitch som gir samme tempo som målet. Prøver også halvt og dobbelt tempo
 * (f.eks. 70 og 140 BPM passer sammen). `multiplier` er egne slag per slag på målet.
 * Gir null hvis ingen passer innenfor tempo-slideren.
 */
export function matchPitch(
  ownBpm: number,
  targetEffectiveBpm: number,
  range = TEMPO_RANGE
): { pitch: number; multiplier: number } | null {
  let best: { pitch: number; multiplier: number } | null = null
  for (const multiplier of [1, 2, 0.5]) {
    const pitch = (targetEffectiveBpm * multiplier) / ownBpm - 1
    if (Math.abs(pitch) <= range + 1e-9 && (!best || Math.abs(pitch) < Math.abs(best.pitch))) best = { pitch, multiplier }
  }
  return best
}

/** Hvor mange egne slag per slag på den andre decken (1, 2 eller 0,5), ut fra tempoene. */
export function beatMultiplier(ownEffectiveBpm: number, otherEffectiveBpm: number): number {
  const ratio = ownEffectiveBpm / otherEffectiveBpm
  return [0.5, 1, 2].reduce((best, m) => (Math.abs(Math.log2(ratio / m)) < Math.abs(Math.log2(ratio / best)) ? m : best), 1)
}

/**
 * Posisjonen nærmest `ownPosition` der slagene ligger oppå slagene på den andre decken.
 * `otherBeats` er hvor mange slag som har gått på den andre decken akkurat nå.
 */
export function alignedPosition(ownPosition: number, ownGrid: BeatGrid, otherBeats: number, multiplier: number): number {
  const wanted = frac(otherBeats * multiplier)
  const current = frac(beatsAt(ownPosition, ownGrid))
  const beatSeconds = 60 / ownGrid.bpm
  let position = ownPosition + wrapHalf(wanted - current) * beatSeconds
  if (position < 0) position += beatSeconds
  return position
}

/**
 * Faseforskjell i slag: positiv betyr at `own` ligger foran `other`.
 * Brukes av fasemåleren.
 */
export function phaseOffset(ownBeats: number, otherBeats: number, multiplier: number): number {
  return wrapHalf(ownBeats - otherBeats * multiplier)
}
