/** Lager kunstige trommespor med kjent tempo, for testene. */

export interface BeatOptions {
  bpm: number
  /** Sekunder til første slag. */
  offset: number
  seconds: number
  sampleRate?: number
  /** Hi-hat mellom slagene. */
  offbeatHats?: boolean
  bass?: boolean
  /** Litt tilfeldig støy over alt. */
  noise?: number
  seed?: number
}

function random(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export function makeBeat(o: BeatOptions): { mono: Float32Array; sampleRate: number } {
  const sr = o.sampleRate ?? 22050
  const out = new Float32Array(Math.floor(o.seconds * sr))
  const rnd = random(o.seed ?? 1)
  const beat = 60 / o.bpm
  const addKick = (t0: number): void => {
    const start = Math.round(t0 * sr)
    for (let i = 0; i < sr * 0.18; i++) {
      const idx = start + i
      if (idx < 0 || idx >= out.length) continue
      const t = i / sr
      const freq = 50 + 90 * Math.exp(-t * 40)
      out[idx] += 0.8 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 18)
    }
  }
  const addHat = (t0: number): void => {
    const start = Math.round(t0 * sr)
    let prev = 0
    for (let i = 0; i < sr * 0.04; i++) {
      const idx = start + i
      if (idx < 0 || idx >= out.length) continue
      const n = rnd() * 2 - 1
      out[idx] += 0.25 * (n - prev) * Math.exp((-i / sr) * 90)
      prev = n
    }
  }
  for (let t = o.offset; t < o.seconds; t += beat) {
    addKick(t)
    if (o.offbeatHats) addHat(t + beat / 2)
  }
  if (o.bass) {
    for (let i = 0; i < out.length; i++) {
      const t = i / sr
      const inBeat = (((t - o.offset) % beat) + beat) % beat
      const env = inBeat > beat * 0.5 ? Math.exp(-(inBeat - beat * 0.5) * 8) : 0
      out[i] += 0.3 * env * Math.sin(2 * Math.PI * 55 * t)
    }
  }
  if (o.noise) for (let i = 0; i < out.length; i++) out[i] += o.noise * (rnd() * 2 - 1)
  return { mono: out, sampleRate: sr }
}
