import { measure, type Level } from './meterMath'

/** Måler nivået på et stereosignal (venstre og høyre hver for seg, så klipping ikke skjules). */
export class LevelMeter {
  readonly input: AudioNode
  private readonly analysers: AnalyserNode[]
  private readonly buffer: Float32Array<ArrayBuffer>

  constructor(ctx: AudioContext) {
    const splitter = ctx.createChannelSplitter(2)
    this.input = splitter
    this.analysers = [0, 1].map((ch) => {
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      splitter.connect(analyser, ch)
      return analyser
    })
    this.buffer = new Float32Array(2048)
  }

  read(): Level {
    let peak = 0
    let rms = 0
    for (const analyser of this.analysers) {
      analyser.getFloatTimeDomainData(this.buffer)
      const level = measure(this.buffer)
      if (level.peak > peak) peak = level.peak
      if (level.rms > rms) rms = level.rms
    }
    return { peak, rms }
  }
}
