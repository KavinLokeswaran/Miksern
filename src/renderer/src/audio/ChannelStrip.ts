import { LevelMeter } from './LevelMeter'

const SMOOTHING = 0.012

/**
 * Kanalstripe for én deck:
 *   input → trim → [EQ, filter, effekter kommer her] → preFader → kanalfader → krysslider → ut
 *
 * `preFader` er punktet der forhåndslytting i hodetelefoner (cue) kan hentes ut senere.
 */
export class ChannelStrip {
  readonly input: GainNode
  readonly trim: GainNode
  /** Signalet før volumfaderen. Uttak for forhåndslytting senere. */
  readonly preFader: GainNode
  readonly fader: GainNode
  readonly crossfade: GainNode
  readonly output: GainNode
  readonly meter: LevelMeter

  constructor(private readonly ctx: AudioContext) {
    this.input = ctx.createGain()
    this.trim = ctx.createGain()
    this.preFader = ctx.createGain()
    this.fader = ctx.createGain()
    this.crossfade = ctx.createGain()
    this.output = this.crossfade
    this.meter = new LevelMeter(ctx)

    this.connectChain([this.input, this.trim, this.preFader, this.fader, this.crossfade])
    // Måleren viser nivået etter volumfaderen, før kryssslideren.
    this.fader.connect(this.meter.input)
  }

  setTrim(gain: number): void {
    this.smooth(this.trim.gain, gain)
  }

  setFader(gain: number): void {
    this.smooth(this.fader.gain, gain)
  }

  setCrossfade(gain: number): void {
    this.smooth(this.crossfade.gain, gain)
  }

  private connectChain(nodes: AudioNode[]): void {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  }

  private smooth(param: AudioParam, value: number): void {
    param.setTargetAtTime(value, this.ctx.currentTime, SMOOTHING)
  }
}
