import { gainToDb } from './curves'

export interface Level {
  /** Høyeste utslag (0–1+, over 1 betyr klipping). */
  peak: number
  /** Gjennomsnittlig nivå (RMS). */
  rms: number
}

/** Regner ut topp og RMS for en blokk med lydprøver. */
export function measure(samples: Float32Array): Level {
  let peak = 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]
    const abs = v < 0 ? -v : v
    if (abs > peak) peak = abs
    sum += v * v
  }
  return { peak, rms: samples.length ? Math.sqrt(sum / samples.length) : 0 }
}

/** Nivå som regnes som klipping (rett under 0 dBFS). */
export const CLIP_LEVEL = 0.999

export const METER_MIN_DB = -48
export const METER_MAX_DB = 3

/** Gjør om nivå til hvor høyt måleren skal lyse (0–1). */
export function meterFraction(gain: number): number {
  const db = gainToDb(gain)
  if (db <= METER_MIN_DB) return 0
  if (db >= METER_MAX_DB) return 1
  return (db - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)
}
