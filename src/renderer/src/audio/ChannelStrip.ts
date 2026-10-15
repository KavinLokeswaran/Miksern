import { dbToGain } from './curves'
import { LevelMeter } from './LevelMeter'
import { EQ_FREQUENCIES, EQ_MID_Q, eqDb, filterSettings, trimDb, type EqBand } from './toneMath'

const SMOOTHING = 0.012
/** Litt resonans gjør filteret tydeligere å høre når det er i bruk. */
const FILTER_RESONANCE_DB = 2

/**
 * Kanalstripe for én deck:
 *   input → trim → EQ (bass, mellomtone, diskant) → filter (lavpass, høypass)
 *   → effekter (fxIn … fxOut) → preFader → kanalfader → krysslider → ut
 *
 * - `fxIn`/`fxOut`: effektene kobles inn mellom disse.
 * - `preFader`: signalet før volumfaderen. Uttak for forhåndslytting i hodetelefoner senere.
 */
export class ChannelStrip {
  readonly input: GainNode
  readonly trim: GainNode
  readonly eq: Record<EqBand, BiquadFilterNode>
  readonly lowpass: BiquadFilterNode
  readonly highpass: BiquadFilterNode
  readonly fxIn: GainNode
  readonly fxOut: GainNode
  readonly preFader: GainNode
  readonly fader: GainNode
  readonly crossfade: GainNode
  readonly output: GainNode
  /** Måler nivået før volumfaderen, som på en ekte DJ-mikser. Da ser du om trim er riktig stilt. */
  readonly meter: LevelMeter

  constructor(private readonly ctx: AudioContext) {
    this.input = ctx.createGain()
    this.trim = ctx.createGain()
    this.eq = {
      low: this.biquad('lowshelf', EQ_FREQUENCIES.low),
      mid: this.biquad('peaking', EQ_FREQUENCIES.mid, EQ_MID_Q),
      high: this.biquad('highshelf', EQ_FREQUENCIES.high)
    }
    this.lowpass = this.biquad('lowpass', 20000, 0)
    this.highpass = this.biquad('highpass', 20, 0)
    this.fxIn = ctx.createGain()
    this.fxOut = ctx.createGain()
    this.preFader = ctx.createGain()
    this.fader = ctx.createGain()
    this.crossfade = ctx.createGain()
    this.output = this.crossfade
    this.meter = new LevelMeter(ctx)

    this.connectChain([
      this.input,
      this.trim,
      this.eq.low,
      this.eq.mid,
      this.eq.high,
      this.lowpass,
      this.highpass,
      this.fxIn
    ])
    // Ingen effekter ennå: koble rett gjennom.
    this.fxIn.connect(this.fxOut)
    this.connectChain([this.fxOut, this.preFader, this.fader, this.crossfade])
    this.preFader.connect(this.meter.input)
  }

  /** Trimknotten, -1 … 1. */
  setTrim(value: number): void {
    this.smooth(this.trim.gain, dbToGain(trimDb(value)))
  }

  /** EQ-knott, -1 … 1. */
  setEq(band: EqBand, value: number): void {
    this.smooth(this.eq[band].gain, eqDb(value))
  }

  /** Filterknotten, -1 … 1. */
  setFilter(value: number): void {
    const { lowpassHz, highpassHz } = filterSettings(value)
    this.smooth(this.lowpass.frequency, lowpassHz)
    this.smooth(this.highpass.frequency, highpassHz)
    this.smooth(this.lowpass.Q, lowpassHz < 20000 ? FILTER_RESONANCE_DB : 0)
    this.smooth(this.highpass.Q, highpassHz > 20 ? FILTER_RESONANCE_DB : 0)
  }

  setFader(gain: number): void {
    this.smooth(this.fader.gain, gain)
  }

  setCrossfade(gain: number): void {
    this.smooth(this.crossfade.gain, gain)
  }

  private biquad(type: BiquadFilterType, frequency: number, q?: number): BiquadFilterNode {
    const node = this.ctx.createBiquadFilter()
    node.type = type
    node.frequency.value = frequency
    if (q !== undefined) node.Q.value = q
    return node
  }

  private connectChain(nodes: AudioNode[]): void {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  }

  private smooth(param: AudioParam, value: number): void {
    param.setTargetAtTime(value, this.ctx.currentTime, SMOOTHING)
  }
}
