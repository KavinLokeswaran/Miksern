import { ChannelStrip } from './ChannelStrip'
import { crossfaderGains, faderGain, type CrossfaderCurve } from './curves'
import { Deck } from './Deck'
import { MasterBus } from './MasterBus'
import type { Level } from './meterMath'
import type { FxKind } from './fxMath'
import type { EqBand } from './toneMath'
import { DECK_IDS, type DeckId, type MeterTarget } from './types'

/** Hele lydmotoren: to decks, to kanalstriper og master. */
export class AudioEngine {
  readonly ctx: AudioContext
  readonly decks: Record<DeckId, Deck>
  readonly strips: Record<DeckId, ChannelStrip>
  readonly master: MasterBus

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' })
    this.master = new MasterBus(this.ctx)
    const decks = {} as Record<DeckId, Deck>
    const strips = {} as Record<DeckId, ChannelStrip>
    for (const id of DECK_IDS) {
      const deck = new Deck(this.ctx)
      const strip = new ChannelStrip(this.ctx)
      deck.output.connect(strip.input)
      strip.output.connect(this.master.input)
      decks[id] = deck
      strips[id] = strip
    }
    this.decks = decks
    this.strips = strips
  }

  /** Nettleseren kan starte lyden i pausemodus. Denne sørger for at den går. */
  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume()
  }

  decode(data: ArrayBuffer): Promise<AudioBuffer> {
    return this.ctx.decodeAudioData(data)
  }

  setChannelVolume(id: DeckId, position: number): void {
    this.strips[id].setFader(faderGain(position))
  }

  setTrim(id: DeckId, value: number): void {
    this.strips[id].setTrim(value)
  }

  setEq(id: DeckId, band: EqBand, value: number): void {
    this.strips[id].setEq(band, value)
  }

  setFilter(id: DeckId, value: number): void {
    this.strips[id].setFilter(value)
  }

  setFx(id: DeckId, kind: FxKind, on: boolean, amount: number): void {
    this.strips[id].setFx(kind, on, amount)
  }

  setTempo(id: DeckId, effectiveBpm: number | null): void {
    this.strips[id].setTempo(effectiveBpm)
  }

  setCrossfader(position: number, curve: CrossfaderCurve): void {
    const { a, b } = crossfaderGains(position, curve)
    this.strips.A.setCrossfade(a)
    this.strips.B.setCrossfade(b)
  }

  setMasterVolume(position: number): void {
    this.master.setVolume(faderGain(position))
  }

  readLevel(target: MeterTarget): Level {
    return target === 'master' ? this.master.meter.read() : this.strips[target].meter.read()
  }
}

let engine: AudioEngine | null = null

export function getEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}
