/** Matte for effektene. Ren logikk, så den kan testes. */

export const FX_KINDS = ['echo', 'reverb', 'flanger'] as const
export type FxKind = (typeof FX_KINDS)[number]

/** Ekkoet kommer hvert halve slag. */
export const ECHO_BEATS = 0.5

export function echoDelaySeconds(effectiveBpm: number | null): number {
  const bpm = effectiveBpm && effectiveBpm > 0 ? effectiveBpm : 120
  return (60 / bpm) * ECHO_BEATS
}

/** Mengde-knotten (0–1) styrer hvor mye som sendes inn i ekkoet og hvor lenge det varer. */
export function echoSettings(amount: number): { send: number; feedback: number } {
  const a = Math.min(1, Math.max(0, amount))
  return { send: 0.3 + 0.6 * a, feedback: 0.25 + 0.4 * a }
}

function random(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s / 2 ** 32) * 2 - 1
  }
}

/**
 * Lager en impulsrespons for romklang: støy som dør ut (ca. -60 dB ved `seconds`),
 * litt mørkere jo lenger ut i klangen (som i et ekte rom).
 */
export function makeImpulseResponse(sampleRate: number, seconds = 2.6, channels = 2): Float32Array<ArrayBuffer>[] {
  const length = Math.floor(sampleRate * seconds)
  const decay = Math.log(1000) / seconds
  return Array.from({ length: channels }, (_, ch) => {
    const rnd = random(1234 + ch * 777)
    const data = new Float32Array(length)
    let low = 0
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      // Mørkere etter hvert: lavpasset blir tettere med tiden.
      const coeff = 0.9 - 0.75 * (t / seconds)
      low += coeff * (rnd() - low)
      data[i] = low * Math.exp(-decay * t)
    }
    return data
  })
}
