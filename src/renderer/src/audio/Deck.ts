import { wrapInLoop, type LoopRegion } from './loopMath'
import { Playhead } from './playhead'

/** Kort inn- og uttoning ved start/stopp, så det ikke klikker. */
const FADE_SECONDS = 0.004

interface ActiveSource {
  node: AudioBufferSourceNode
  envelope: GainNode
}

/**
 * Én deck: spiller av en AudioBuffer og holder selv styr på posisjonen.
 * AudioBufferSourceNode kan bare startes én gang, så det lages en ny ved hver
 * play, hopp eller tempoendring som krever det.
 */
export class Deck {
  /** Lyden fra decken går ut her (videre til kanalstripen). */
  readonly output: GainNode
  private buffer: AudioBuffer | null = null
  private source: ActiveSource | null = null
  private readonly clock = new Playhead()
  private rate = 1
  private loop: LoopRegion | null = null

  /** Kalles når låten spiller helt til slutten av seg selv. */
  onEnded: (() => void) | null = null

  constructor(private readonly ctx: AudioContext) {
    this.output = ctx.createGain()
  }

  get isLoaded(): boolean {
    return this.buffer !== null
  }

  get isPlaying(): boolean {
    return this.source !== null
  }

  get duration(): number {
    return this.buffer?.duration ?? 0
  }

  /** Nåværende posisjon i sekunder (tar hensyn til en aktiv loop). */
  get position(): number {
    const pos = wrapInLoop(this.clock.position(this.ctx.currentTime), this.loop)
    return Math.min(Math.max(pos, 0), this.duration)
  }

  get loopRegion(): LoopRegion | null {
    return this.loop
  }

  /**
   * Starter (eller endrer) en loop. Lyden går sømløst i ring mellom start og slutt.
   * Er vi allerede forbi den nye slutten, hopper vi inn i loopen.
   */
  setLoop(region: LoopRegion): void {
    if (!this.buffer) return
    const now = this.ctx.currentTime
    const current = this.position
    // Nullstill klokka her, så loop-matten regner fra en posisjon innenfor loopen.
    this.clock.set(current, now)
    this.loop = region
    const length = region.end - region.start
    const outside = current >= region.end || current < region.start - length
    if (outside) {
      const inside = region.start + ((((current - region.start) % length) + length) % length)
      this.seek(inside)
      return
    }
    if (this.source) {
      const node = this.source.node
      node.loopStart = region.start
      node.loopEnd = region.end
      node.loop = true
    }
  }

  /** Avslutter loopen. Avspillingen fortsetter videre i låten. */
  clearLoop(): void {
    if (!this.loop) return
    const now = this.ctx.currentTime
    this.clock.set(this.position, now)
    this.loop = null
    if (this.source) this.source.node.loop = false
  }

  load(buffer: AudioBuffer): void {
    this.loop = null
    this.stopSource()
    this.buffer = buffer
    this.clock.stop(this.ctx.currentTime)
    this.clock.set(0, this.ctx.currentTime)
  }

  unload(): void {
    this.loop = null
    this.stopSource()
    this.buffer = null
    this.clock.stop(this.ctx.currentTime)
    this.clock.set(0, this.ctx.currentTime)
  }

  play(): void {
    if (!this.buffer || this.source) return
    let pos = this.position
    if (pos >= this.duration - 0.01) pos = 0
    this.startSource(pos)
  }

  pause(): void {
    if (!this.source) return
    const pos = this.position
    this.stopSource()
    this.clock.stop(this.ctx.currentTime)
    this.clock.set(pos, this.ctx.currentTime)
  }

  /** Hopper til en posisjon (sekunder). Fortsetter å spille hvis decken spilte. */
  seek(seconds: number): void {
    if (!this.buffer) return
    const pos = Math.min(Math.max(seconds, 0), this.duration)
    // Hopper du ut av loopen, er loopen ferdig.
    if (this.loop && (pos < this.loop.start || pos >= this.loop.end)) this.loop = null
    if (this.source) {
      this.stopSource()
      this.startSource(pos)
    } else {
      this.clock.set(pos, this.ctx.currentTime)
    }
  }

  /** Avspillingshastighet (1 = normal). Endrer også tonehøyden, som en platespiller. */
  setRate(rate: number): void {
    this.rate = rate
    const now = this.ctx.currentTime
    this.clock.setRate(rate, now)
    this.source?.node.playbackRate.setValueAtTime(rate, now)
  }

  private startSource(pos: number): void {
    const buffer = this.buffer
    if (!buffer) return
    const now = this.ctx.currentTime
    const node = this.ctx.createBufferSource()
    node.buffer = buffer
    node.playbackRate.value = this.rate
    if (this.loop) {
      node.loop = true
      node.loopStart = this.loop.start
      node.loopEnd = this.loop.end
    }
    const envelope = this.ctx.createGain()
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(1, now + FADE_SECONDS)
    node.connect(envelope).connect(this.output)

    const active: ActiveSource = { node, envelope }
    node.onended = () => {
      // Bare en naturlig slutt teller. Stopper vi selv, er source allerede byttet ut.
      if (this.source !== active) return
      this.source = null
      envelope.disconnect()
      this.clock.stop(this.ctx.currentTime)
      this.clock.set(this.duration, this.ctx.currentTime)
      this.onEnded?.()
    }
    node.start(now, pos)
    this.clock.setRate(this.rate, now)
    this.clock.start(pos, now)
    this.source = active
  }

  private stopSource(): void {
    const active = this.source
    if (!active) return
    this.source = null
    const now = this.ctx.currentTime
    active.envelope.gain.cancelScheduledValues(now)
    active.envelope.gain.setValueAtTime(active.envelope.gain.value, now)
    active.envelope.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
    active.node.stop(now + FADE_SECONDS + 0.001)
    active.node.onended = () => active.envelope.disconnect()
  }
}
