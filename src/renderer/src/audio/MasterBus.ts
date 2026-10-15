import { LevelMeter } from './LevelMeter'

/**
 * Master: sum → mastervolum → limiter → høyttalere.
 * `output` (etter limiteren) er det samme som du hører, og kan brukes til opptak.
 */
export class MasterBus {
  readonly input: GainNode
  readonly volume: GainNode
  readonly limiter: DynamicsCompressorNode
  readonly output: GainNode
  /** Måler før limiteren, så klippevarselet viser når du faktisk spiller for høyt. */
  readonly meter: LevelMeter

  constructor(private readonly ctx: AudioContext) {
    this.input = ctx.createGain()
    this.volume = ctx.createGain()
    this.limiter = ctx.createDynamicsCompressor()
    this.output = ctx.createGain()
    this.meter = new LevelMeter(ctx)

    // Innstillinger som får kompressoren til å oppføre seg nesten som en limiter.
    this.limiter.threshold.value = -1
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.002
    this.limiter.release.value = 0.12

    this.input.connect(this.volume)
    this.volume.connect(this.meter.input)
    this.volume.connect(this.limiter)
    this.limiter.connect(this.output)
    this.output.connect(ctx.destination)
  }

  setVolume(gain: number): void {
    this.volume.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.012)
  }
}
