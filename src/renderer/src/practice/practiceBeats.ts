import {
  durationSeconds,
  partsFor,
  PRACTICE_BEATS,
  sectionOfBar,
  TOTAL_BARS,
  type PracticeBeatSpec,
  type Section
} from './arrangement'

/**
 * Lager øvelses-beatene med Web Audio (OfflineAudioContext), så grunnkurset og
 * leksjonene alltid kan gjennomføres – også uten egen musikk.
 * Første slag ligger nøyaktig på 0 sekunder, så beatgridet er kjent.
 *
 * Musikken gjentar seg i blokker på fire takter. Hver ulik blokk lages bare én gang
 * og settes så sammen – det går mye raskere enn å lage hele låten på én gang.
 */

const SAMPLE_RATE = 44100
const BLOCK_BARS = 4
/** Ekstra lengde etter hver blokk, så lyder som klinger ut ikke kuttes. */
const TAIL_SECONDS = 1.2
const cache = new Map<1 | 2, Promise<AudioBuffer>>()

export function getPracticeBeat(id: 1 | 2): Promise<AudioBuffer> {
  let promise = cache.get(id)
  if (!promise) {
    promise = render(PRACTICE_BEATS[id])
    cache.set(id, promise)
    promise.catch(() => cache.delete(id))
  }
  return promise
}

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let s = 42
  for (let i = 0; i < data.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    data[i] = (s / 2 ** 32) * 2 - 1
  }
  return buffer
}

async function render(spec: PracticeBeatSpec): Promise<AudioBuffer> {
  const beat = 60 / spec.bpm
  const sections = [...new Set(Array.from({ length: TOTAL_BARS }, (_, bar) => sectionOfBar(bar)))]
  const blocks = new Map<Section, AudioBuffer>()
  for (const section of sections) blocks.set(section, await renderBlock(spec, section))

  const length = Math.ceil(durationSeconds(spec) * SAMPLE_RATE)
  const result = new AudioBuffer({ numberOfChannels: 2, length, sampleRate: SAMPLE_RATE })
  for (let bar = 0; bar < TOTAL_BARS; bar += BLOCK_BARS) {
    const block = blocks.get(sectionOfBar(bar))!
    const offset = Math.round(bar * 4 * beat * SAMPLE_RATE)
    for (let ch = 0; ch < 2; ch++) {
      const out = result.getChannelData(ch)
      const src = block.getChannelData(ch)
      const n = Math.min(src.length, length - offset)
      // Legg sammen (ikke erstatt), så klangen fra forrige blokk blir med.
      for (let i = 0; i < n; i++) out[offset + i] += src[i]
    }
  }
  return result
}

/** Lager én blokk på fire takter av en del av låten. */
async function renderBlock(spec: PracticeBeatSpec, section: Section): Promise<AudioBuffer> {
  const seconds = (BLOCK_BARS * 4 * 60) / spec.bpm + TAIL_SECONDS
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE)
  const out = ctx.createGain()
  out.gain.value = 0.7
  out.connect(ctx.destination)
  const noise = noiseBuffer(ctx)
  const beat = 60 / spec.bpm

  // Felles busser med filtre, så hver lyd bare trenger kilde og volumkurve.
  const hatBus = ctx.createBiquadFilter()
  hatBus.type = 'highpass'
  hatBus.frequency.value = spec.hat === 'ride' ? 5000 : 7500
  const hatPan = ctx.createStereoPanner()
  hatPan.pan.value = 0.25
  hatBus.connect(hatPan).connect(out)

  const clapBus = ctx.createBiquadFilter()
  clapBus.type = 'bandpass'
  clapBus.frequency.value = 1400
  clapBus.Q.value = 0.9
  clapBus.connect(out)

  const bassBus = ctx.createBiquadFilter()
  bassBus.type = 'lowpass'
  bassBus.frequency.value = 520
  bassBus.Q.value = 6
  bassBus.connect(out)

  const padBus = ctx.createBiquadFilter()
  padBus.type = 'lowpass'
  padBus.frequency.value = 1300
  padBus.connect(out)

  const kick = (t: number): void => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    gain.gain.setValueAtTime(1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + 0.36)
  }

  const noiseHit = (bus: AudioNode, t: number, level: number, length: number): void => {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(level, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + length)
    src.connect(gain).connect(bus)
    src.start(t, Math.random() * 0.5)
    src.stop(t + length + 0.01)
  }

  const clap = (t: number): void => {
    // Tre raske støyslag rett etter hverandre låter som en håndklapp.
    for (const d of [0, 0.012, 0.024]) noiseHit(clapBus, t + d, 0.5, d === 0.024 ? 0.18 : 0.02)
  }

  const bassNote = (t: number, freq: number): void => {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.32, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.45)
    osc.connect(gain).connect(bassBus)
    osc.start(t)
    osc.stop(t + beat * 0.5)
  }

  const padChord = (t: number, root: number, length: number): void => {
    // Moll-akkord: grunntone, liten ters og kvint, to oktaver opp.
    for (const ratio of [4, 4 * 1.189, 4 * 1.498]) {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = root * ratio
        osc.detune.value = detune
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.025, t + length * 0.3)
        gain.gain.linearRampToValueAtTime(0, t + length)
        osc.connect(gain).connect(padBus)
        osc.start(t)
        osc.stop(t + length)
      }
    }
  }

  const parts = partsFor(section)
  for (let bar = 0; bar < BLOCK_BARS; bar++) {
    const barStart = bar * 4 * beat
    const root = spec.roots[bar % spec.roots.length]
    if (parts.pad) padChord(barStart, root, 4 * beat)
    for (let b = 0; b < 4; b++) {
      const t = barStart + b * beat
      if (parts.kick) kick(t)
      if (parts.hats) {
        noiseHit(hatBus, t + beat / 2, spec.hat === 'ride' ? 0.18 : 0.3, spec.hat === 'ride' ? 0.35 : 0.12)
        noiseHit(hatBus, t, 0.08, 0.03)
      }
      if (parts.clap && (b === 1 || b === 3)) clap(t)
      if (parts.bass) bassNote(t + beat / 2, root)
    }
  }
  return ctx.startRendering()
}
