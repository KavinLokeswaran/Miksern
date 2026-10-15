import { getEngine } from '../audio/AudioEngine'
import { CLIP_LEVEL } from '../audio/meterMath'
import type { MeterTarget } from '../audio/types'
import { onTick } from './ticker'

/**
 * Følger med på klipping og limiter for hele appen, så klippevarselet
 * (og senere tipsene) kan lese det fra ett sted.
 */
const lastClip: Record<MeterTarget, number> = { A: -Infinity, B: -Infinity, master: -Infinity }
let lastLimiting = -Infinity
let started = false

/** Over så mange dB demping regnes limiteren som «i arbeid». */
const LIMITING_DB = 1

export function startClipMonitor(): void {
  if (started) return
  started = true
  const engine = getEngine()
  onTick((now) => {
    let masterPeak = 0
    for (const target of ['A', 'B', 'master'] as const) {
      const peak = engine.readLevel(target).peak
      if (peak >= CLIP_LEVEL) lastClip[target] = now
      if (target === 'master') masterPeak = peak
    }
    // Kompressoren kan melde demping like etter oppstart selv i stillhet. Teller bare når det er sterk lyd.
    if (engine.master.limiterReduction > LIMITING_DB && masterPeak > 0.5) lastLimiting = now
  })
}

/** Har dette klippet de siste `withinMs` millisekundene? */
export function clippedRecently(target: MeterTarget, withinMs: number, now = performance.now()): boolean {
  return now - lastClip[target] < withinMs
}

export function limitingRecently(withinMs: number, now = performance.now()): boolean {
  return now - lastLimiting < withinMs
}
