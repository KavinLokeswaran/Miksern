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
  /** Midlertidig skyv (nudge) oppå tempoet: 1 = ingen, 1.04 = 4 % raskere. */
  private bend = 1
  /** Mens noen holder i platen (scratch), styrer hånda farten, ikke tempoet. */
  private scratch: { wasPlaying: boolean; rate: number } | null = null
  private loop: LoopRegion | null = null

  /** Kalles når låten spiller helt til slutten av seg selv. */
  onEnded: (() => void) | null = null

  constructor(private readonly ctx: AudioContext) {
    this.output = ctx.createGain()
  }

  get isLoaded(): boolean {
    return this.buffer !== null
  }

  /** Spiller decken? Under scratch: om den spilte da hånda tok tak i platen. */
  get isPlaying(): boolean {
    return this.scratch ? this.scratch.wasPlaying : this.source !== null
  }

  get isScratching(): boolean {
    return this.scratch !== null
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
    if (this.scratch) {
      this.scratch.wasPlaying = true
      return
    }
    if (!this.buffer || this.source) return
    let pos = this.position
    if (pos >= this.duration - 0.01) pos = 0
    this.startSource(pos)
  }

  pause(): void {
    if (this.scratch) {
      this.scratch.wasPlaying = false
      return
    }
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
    this.applyRate()
  }

  /** Skyver låten litt raskere eller saktere (1 = normalt), uten å endre tempo-slideren. */
  setBend(factor: number): void {
    if (factor === this.bend) return
    this.bend = factor
    this.applyRate()
  }

  /**
   * Hånda tar tak i platen. Låten står stille til hånda beveger seg.
   * Står decken stille, kan du likevel scratche – da høres lyden bare mens hånda beveger seg.
   */
  beginScratch(): void {
    if (!this.buffer || this.scratch) return
    this.scratch = { wasPlaying: this.source !== null, rate: 0 }
    if (this.source) this.applyRate()
    else this.startSource(this.position)
  }

  /** Farten hånda drar platen med (1 = normal fart, negativ = baklengs). */
  setScratchRate(rate: number): void {
    if (!this.scratch) return
    const pos = this.position
    // Stopp ved start og slutt, så lyden ikke tar slutt midt i en scratch.
    if ((rate < 0 && pos <= 0.005) || (rate > 0 && pos >= this.duration - 0.005)) rate = 0
    this.scratch.rate = rate
    if (this.source) this.applyRate()
    else this.startSource(pos)
  }

  /** Hånda slipper platen. Spilte decken, fortsetter den der hånda slapp. */
  endScratch(): void {
    const scratch = this.scratch
    if (!scratch) return
    this.scratch = null
    if (scratch.wasPlaying) {
      if (this.source) this.applyRate()
      else this.startSource(this.position)
      return
    }
    const pos = this.position
    this.stopSource()
    this.clock.stop(this.ctx.currentTime)
    this.clock.set(pos, this.ctx.currentTime)
  }

  /** Farten lyden faktisk spilles med akkurat nå. */
  private get audioRate(): number {
    return this.scratch ? this.scratch.rate : this.rate * this.bend
  }

  private applyRate(): void {
    const now = this.ctx.currentTime
    const rate = this.audioRate
    this.clock.setRate(rate, now)
    this.source?.node.playbackRate.setValueAtTime(rate, now)
  }

  private startSource(pos: number): void {
    const buffer = this.buffer
    if (!buffer) return
    const now = this.ctx.currentTime
    const node = this.ctx.createBufferSource()
    node.buffer = buffer
    const rate = this.audioRate
    node.playbackRate.value = rate
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
    this.clock.setRate(rate, now)
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
