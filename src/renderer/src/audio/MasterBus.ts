import { LevelMeter } from './LevelMeter'
import { makeSafetyCurve } from './toneMath'

/**
 * Master: sum → mastervolum → limiter → sikring → høyttalere.
 * `output` (etter limiteren) er det samme som du hører, og brukes til opptak.
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
    this.limiter.threshold.value = -1.5
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.001
    this.limiter.release.value = 0.15

    // Kompressoren kan slippe gjennom korte topper. Sikringen runder dem mykt av,
    // så lyden aldri går over 0 dBFS. Signalet skaleres ned først, så kurven får plass til ±2.
    const scaleIn = ctx.createGain()
    scaleIn.gain.value = 0.5
    const safety = ctx.createWaveShaper()
    safety.curve = makeSafetyCurve()
    safety.oversample = '4x'

    this.input.connect(this.volume)
    this.volume.connect(this.meter.input)
    this.volume.connect(this.limiter)
    this.limiter.connect(scaleIn).connect(safety).connect(this.output)
    this.output.connect(ctx.destination)
  }

  setVolume(gain: number): void {
    this.volume.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.012)
  }

  /** Hvor mye limiteren demper akkurat nå, i dB (0 = ingenting). */
  get limiterReduction(): number {
    return -this.limiter.reduction
  }
}
