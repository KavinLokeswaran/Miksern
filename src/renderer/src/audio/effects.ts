import { echoDelaySeconds, echoSettings, makeImpulseResponse, type FxKind } from './fxMath'

const SMOOTHING = 0.02

/** Felles for alle effektene: lyden går rett gjennom (dry), og effekten legges oppå (wet). */
export interface Effect {
  readonly input: GainNode
  readonly output: GainNode
  setEnabled(on: boolean): void
  setAmount(amount: number): void
}

abstract class BaseEffect implements Effect {
  readonly input: GainNode
  readonly output: GainNode
  protected on = false
  protected amount = 0.5

  constructor(protected readonly ctx: BaseAudioContext) {
    this.input = ctx.createGain()
    this.output = ctx.createGain()
    // Tørt signal går alltid rett gjennom.
    this.input.connect(this.output)
  }

  setEnabled(on: boolean): void {
    this.on = on
    this.update()
  }

  setAmount(amount: number): void {
    this.amount = Math.min(1, Math.max(0, amount))
    this.update()
  }

  protected smooth(param: AudioParam, value: number, time = SMOOTHING): void {
    param.setTargetAtTime(value, this.ctx.currentTime, time)
  }

  protected abstract update(): void
}

/**
 * Echo (delay) i takt med låten. Slår du det av, slutter nye lyder å gå inn,
 * men ekkoet som allerede er der, får klinge ut – fint for å avslutte en låt.
 */
export class EchoEffect extends BaseEffect {
  private readonly send: GainNode
  private readonly delay: DelayNode
  private readonly feedback: GainNode

  constructor(ctx: BaseAudioContext) {
    super(ctx)
    this.send = ctx.createGain()
    this.send.gain.value = 0
    this.delay = ctx.createDelay(2)
    this.delay.delayTime.value = echoDelaySeconds(null)
    this.feedback = ctx.createGain()
    // Ekkoene blir litt mørkere og tynnere for hver gang, som en ekte tape-delay.
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 250
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 3500

    this.input.connect(this.send).connect(this.delay).connect(this.output)
    this.delay.connect(highpass).connect(lowpass).connect(this.feedback).connect(this.delay)
    this.update()
  }

  /** Følger tempoet på decken. */
  setTempo(effectiveBpm: number | null): void {
    this.smooth(this.delay.delayTime, echoDelaySeconds(effectiveBpm), 0.05)
  }

  protected update(): void {
    const { send, feedback } = echoSettings(this.amount)
    this.smooth(this.send.gain, this.on ? send : 0)
    this.smooth(this.feedback.gain, feedback)
  }
}

const impulseCache = new WeakMap<BaseAudioContext, AudioBuffer>()

function impulseFor(ctx: BaseAudioContext): AudioBuffer {
  let buffer = impulseCache.get(ctx)
  if (!buffer) {
    const channels = makeImpulseResponse(ctx.sampleRate)
    buffer = ctx.createBuffer(2, channels[0].length, ctx.sampleRate)
    channels.forEach((data, i) => buffer!.copyToChannel(data, i))
    impulseCache.set(ctx, buffer)
  }
  return buffer
}

/** Reverb (romklang) laget med en impulsrespons appen lager selv. Klangen får også klinge ut. */
export class ReverbEffect extends BaseEffect {
  private readonly send: GainNode

  constructor(ctx: BaseAudioContext) {
    super(ctx)
    this.send = ctx.createGain()
    this.send.gain.value = 0
    const preDelay = ctx.createDelay(0.1)
    preDelay.delayTime.value = 0.02
    const convolver = ctx.createConvolver()
    convolver.buffer = impulseFor(ctx)
    const wet = ctx.createGain()
    wet.gain.value = 0.8
    this.input.connect(this.send).connect(preDelay).connect(convolver).connect(wet).connect(this.output)
    this.update()
  }

  protected update(): void {
    this.smooth(this.send.gain, this.on ? 0.15 + 0.85 * this.amount : 0)
  }
}

/** Flanger: en kort forsinkelse som sakte svinger, og gir den kjente «jetfly»-lyden. */
export class FlangerEffect extends BaseEffect {
  private readonly wet: GainNode
  private readonly feedback: GainNode

  constructor(ctx: BaseAudioContext) {
    super(ctx)
    const delay = ctx.createDelay(0.05)
    delay.delayTime.value = 0.004
    this.feedback = ctx.createGain()
    this.wet = ctx.createGain()
    this.wet.gain.value = 0
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.2
    const depth = ctx.createGain()
    depth.gain.value = 0.0028
    lfo.connect(depth).connect(delay.delayTime)
    lfo.start()

    this.input.connect(delay).connect(this.wet).connect(this.output)
    delay.connect(this.feedback).connect(delay)
    this.update()
  }

  protected update(): void {
    this.smooth(this.wet.gain, this.on ? 0.3 + 0.6 * this.amount : 0)
    this.smooth(this.feedback.gain, 0.3 + 0.4 * this.amount)
  }
}

/** Effektene for én kanal, koblet etter hverandre: echo → reverb → flanger. */
export class EffectChain {
  readonly echo: EchoEffect
  readonly units: Record<FxKind, Effect>

  constructor(ctx: BaseAudioContext, input: AudioNode, output: AudioNode) {
    this.echo = new EchoEffect(ctx)
    const reverb = new ReverbEffect(ctx)
    const flanger = new FlangerEffect(ctx)
    this.units = { echo: this.echo, reverb, flanger }
    input.connect(this.echo.input)
    this.echo.output.connect(reverb.input)
    reverb.output.connect(flanger.input)
    flanger.output.connect(output)
  }
}
