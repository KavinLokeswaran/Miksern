import { WAVEFORM_BINS_PER_SECOND, type BeatGrid } from '@shared/analysis'

/**
 * BPM-, beatgrid- og bølgeformanalyse. Ren matte uten Web Audio, så den kan
 * kjøres i en Web Worker og testes i Node.
 */

export interface AnalysisOutput {
  grid: BeatGrid | null
  confidence: number
  duration: number
  binsPerSecond: number
  waveform: Uint8Array
}

/** Tempoområdet vi leter i. Tempo utenfor brettes inn (f.eks. 60 → 120). */
export const MIN_BPM = 78
export const MAX_BPM = 178

/** Under denne regnes tempoet som usikkert, og vi viser ikke noe beatgrid. */
const MIN_CONFIDENCE = 0.3

/** Hvor mange onset-målinger per sekund. */
const ONSET_RATE = 200

/** Enkelt førsteordens lavpassfilter (koeffisient for en gitt grensefrekvens). */
function onePoleCoefficient(cutoffHz: number, sampleRate: number): number {
  return 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate)
}

/** Deler lyden i bass, mellomtone og diskant og finner toppnivå per bølgeform-punkt. */
export function computeWaveform(
  mono: Float32Array,
  sampleRate: number,
  binsPerSecond = WAVEFORM_BINS_PER_SECOND
): Uint8Array {
  const samplesPerBin = sampleRate / binsPerSecond
  const bins = Math.max(1, Math.ceil(mono.length / samplesPerBin))
  const raw = new Float32Array(bins * 3)
  const aLow = onePoleCoefficient(200, sampleRate)
  const aHigh = onePoleCoefficient(2500, sampleRate)
  let low = 0
  let low2 = 0
  let belowHigh = 0
  for (let i = 0; i < mono.length; i++) {
    const x = mono[i]
    // To lavpass etter hverandre gir brattere bassfilter.
    low += aLow * (x - low)
    low2 += aLow * (low - low2)
    belowHigh += aHigh * (x - belowHigh)
    const high = x - belowHigh
    const mid = belowHigh - low2
    const b = Math.floor(i / samplesPerBin) * 3
    const al = Math.abs(low2)
    const am = Math.abs(mid)
    const ah = Math.abs(high)
    if (al > raw[b]) raw[b] = al
    if (am > raw[b + 1]) raw[b + 1] = am
    if (ah > raw[b + 2]) raw[b + 2] = ah
  }
  let max = 0
  for (let i = 0; i < raw.length; i++) if (raw[i] > max) max = raw[i]
  const out = new Uint8Array(raw.length)
  if (max === 0) return out
  for (let i = 0; i < raw.length; i++) out[i] = Math.round((raw[i] / max) * 255)
  return out
}

/**
 * Onset-styrke: hvor mye lyden plutselig blir kraftigere, ONSET_RATE ganger i sekundet.
 * Bassen vektes mest, fordi det er der trommeslagene (kicken) ligger.
 */
export function onsetEnvelope(mono: Float32Array, sampleRate: number): Float32Array {
  const hop = sampleRate / ONSET_RATE
  const frames = Math.floor(mono.length / hop)
  const lowEnergy = new Float32Array(frames)
  const fullEnergy = new Float32Array(frames)
  const aLow = onePoleCoefficient(150, sampleRate)
  const aDc = onePoleCoefficient(40, sampleRate)
  let low = 0
  let low2 = 0
  let dc = 0
  for (let f = 0; f < frames; f++) {
    const start = Math.floor(f * hop)
    const end = Math.floor((f + 1) * hop)
    let el = 0
    let ef = 0
    for (let i = start; i < end; i++) {
      const x = mono[i]
      low += aLow * (x - low)
      low2 += aLow * (low - low2)
      dc += aDc * (x - dc)
      const full = x - dc
      el += low2 * low2
      ef += full * full
    }
    // RMS (ikke logaritme): da teller kraftige slag (kick) mer enn svakere toner (bass).
    const n = Math.max(1, end - start)
    lowEnergy[f] = Math.sqrt(el / n)
    fullEnergy[f] = Math.sqrt(ef / n)
  }
  const onset = new Float32Array(frames)
  for (let f = 1; f < frames; f++) {
    const dl = lowEnergy[f] - lowEnergy[f - 1]
    const df = fullEnergy[f] - fullEnergy[f - 1]
    onset[f] = (dl > 0 ? dl : 0) + 0.5 * (df > 0 ? df : 0)
  }
  // Trekk fra et glidende gjennomsnitt, så bare de tydelige toppene blir igjen.
  const window = Math.round(ONSET_RATE * 0.25)
  const out = new Float32Array(frames)
  let sum = 0
  for (let f = 0; f < frames; f++) {
    sum += onset[f]
    if (f >= window) sum -= onset[f - window]
    const centre = f - (window >> 1)
    if (centre >= 0) {
      const v = onset[centre] - sum / Math.min(f + 1, window)
      out[centre] = v > 0 ? v : 0
    }
  }
  return out
}

/** Autokorrelasjon: hvor godt onset-kurven likner på seg selv forskjøvet `lag` målinger. */
function autocorrelation(env: Float32Array, maxLag: number): Float32Array {
  const acf = new Float32Array(maxLag + 2)
  const n = env.length
  for (let lag = 1; lag <= maxLag + 1; lag++) {
    let s = 0
    for (let i = lag; i < n; i++) s += env[i] * env[i - lag]
    acf[lag] = s / (n - lag)
  }
  return acf
}

function interpolate(arr: Float32Array, x: number): number {
  const i = Math.floor(x)
  if (i < 0 || i + 1 >= arr.length) return 0
  const t = x - i
  return arr[i] * (1 - t) + arr[i + 1] * t
}

/** Grovt tempo: prøver alle tempo i området og ser hvilket som passer best med onset-kurven. */
function coarseTempo(env: Float32Array): number {
  const maxLag = Math.ceil(((ONSET_RATE * 60) / MIN_BPM) * 4)
  const acf = autocorrelation(env, Math.min(maxLag, env.length - 2))
  let best = 120
  let bestScore = -Infinity
  for (let bpm = MIN_BPM; bpm < MAX_BPM; bpm += 0.25) {
    const lag = (ONSET_RATE * 60) / bpm
    // Et riktig tempo gir også treff på 2 og 4 slag, og på halve slag.
    const score =
      interpolate(acf, lag) +
      0.5 * interpolate(acf, lag * 2) +
      0.25 * interpolate(acf, lag * 4) +
      0.25 * interpolate(acf, lag / 2)
    // Liten forkjærlighet for vanlig dansemusikk-tempo, så vi sjeldnere tar feil med dobbelt/halvt.
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 125) / 0.9, 2))
    const weighted = score * (0.85 + 0.15 * prior)
    if (weighted > bestScore) {
      bestScore = weighted
      best = bpm
    }
  }
  return best
}

const PHASE_BINS = 96

/**
 * Bretter onset-kurven over én slaglengde og ser hvor skarp toppen blir.
 * Riktig tempo gir én skarp topp der slagene ligger.
 */
function foldScore(env: Float32Array, bpm: number): { score: number; phase: number; hist: Float64Array } {
  const period = (ONSET_RATE * 60) / bpm
  const hist = new Float64Array(PHASE_BINS)
  for (let f = 0; f < env.length; f++) {
    const v = env[f]
    if (v === 0) continue
    const pos = ((f % period) / period) * PHASE_BINS
    const i = Math.floor(pos)
    const t = pos - i
    hist[i % PHASE_BINS] += v * (1 - t)
    hist[(i + 1) % PHASE_BINS] += v * t
  }
  // Glatt litt (3 bins) så små ujevnheter ikke avgjør.
  let bestBin = 0
  let best = -Infinity
  for (let i = 0; i < PHASE_BINS; i++) {
    const s = hist[(i + PHASE_BINS - 1) % PHASE_BINS] * 0.5 + hist[i] + hist[(i + 1) % PHASE_BINS] * 0.5
    if (s > best) {
      best = s
      bestBin = i
    }
  }
  // Finere plassering av toppen med parabeltilpasning.
  const y0 = hist[(bestBin + PHASE_BINS - 1) % PHASE_BINS]
  const y1 = hist[bestBin]
  const y2 = hist[(bestBin + 1) % PHASE_BINS]
  const denom = y0 - 2 * y1 + y2
  const offset = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0
  const phase = ((((bestBin + Math.max(-0.5, Math.min(0.5, offset))) / PHASE_BINS) % 1) + 1) % 1
  return { score: best, phase, hist }
}

/** Gjennomsnittlig nivå i fold-histogrammet rundt en fase (0–1). */
function histAt(hist: Float64Array, phase: number): number {
  const centre = Math.round(phase * PHASE_BINS)
  let sum = 0
  for (let d = -2; d <= 2; d++) sum += hist[(((centre + d) % PHASE_BINS) + PHASE_BINS) % PHASE_BINS]
  return sum / 5
}

/**
 * Halvt eller dobbelt tempo? Vi bretter over det langsomme tempoet og ser på
 * slaget midt mellom: Er det nesten like sterkt, er det et ekte slag (dobbelt tempo).
 * Er det mye svakere (f.eks. bare en hi-hat), er det langsomme tempoet riktig.
 */
function chooseOctave(env: Float32Array, bpm: number): number {
  const slow = bpm >= 2 * MIN_BPM ? bpm / 2 : bpm
  const fast = slow * 2
  if (fast >= MAX_BPM || slow < MIN_BPM) return bpm
  const { phase, hist } = foldScore(env, slow)
  const onBeat = histAt(hist, phase)
  const between = histAt(hist, phase + 0.5)
  return onBeat > 0 && between / onBeat > 0.6 ? fast : slow
}

/**
 * Hvor sikker er analysen? Vi sammenligner med noen tempo som ikke henger sammen
 * med det vi fant. Musikk med tydelig takt gir stor forskjell, støy gir nesten ingen.
 */
function tempoConfidence(env: Float32Array, bpm: number, score: number): number {
  const others = [1.13, 0.89, 1.37, 0.73, 1.21].map((r) => foldScore(env, bpm * r).score)
  const baseline = others.reduce((a, b) => a + b, 0) / others.length
  return score > 0 ? Math.max(0, Math.min(1, 1 - baseline / score)) : 0
}

/** Mange låter er laget med et helt tall som tempo. Er vi veldig nær, runder vi av. */
export function snapBpm(bpm: number): number {
  const rounded = Math.round(bpm)
  if (Math.abs(bpm - rounded) < 0.06) return rounded
  const half = Math.round(bpm * 2) / 2
  if (Math.abs(bpm - half) < 0.03) return half
  return Math.round(bpm * 100) / 100
}

export function detectBeatGrid(mono: Float32Array, sampleRate: number): { grid: BeatGrid | null; confidence: number } {
  const env = onsetEnvelope(mono, sampleRate)
  if (env.length < ONSET_RATE * 4) return { grid: null, confidence: 0 }

  const coarse = chooseOctave(env, coarseTempo(env))
  // Finjuster tempoet ved å brette hele låten over slaglengden.
  let bestBpm = coarse
  let bestScore = -Infinity
  for (let bpm = coarse - 1; bpm <= coarse + 1; bpm += 0.01) {
    const { score } = foldScore(env, bpm)
    if (score > bestScore) {
      bestScore = score
      bestBpm = bpm
    }
  }
  const bpm = snapBpm(bestBpm)
  const { phase, score } = foldScore(env, bpm)
  const beatSeconds = 60 / bpm
  const firstBeat = (((phase * beatSeconds) % beatSeconds) + beatSeconds) % beatSeconds
  const confidence = tempoConfidence(env, bpm, score)
  if (confidence < MIN_CONFIDENCE) return { grid: null, confidence }
  return { grid: { bpm, firstBeat }, confidence }
}

export function analyseMono(mono: Float32Array, sampleRate: number): AnalysisOutput {
  const { grid, confidence } = detectBeatGrid(mono, sampleRate)
  return {
    grid,
    confidence,
    duration: mono.length / sampleRate,
    binsPerSecond: WAVEFORM_BINS_PER_SECOND,
    waveform: computeWaveform(mono, sampleRate)
  }
}
