import { interleaveToPcm16, WAV_MAX_DATA_BYTES } from '@shared/wav'
import type { AudioEngine } from '../audio/AudioEngine'
import workletUrl from './recorder.worklet.ts?worker&url'

/**
 * Tar opp hele miksen (master etter limiteren, altså det du hører) til en WAV-fil.
 * Lyden sendes fortløpende til main-prosessen, som skriver den til disk.
 */
export class MixRecorder {
  private node: AudioWorkletNode | null = null
  private mute: GainNode | null = null
  private moduleLoaded = false
  private bytes = 0
  /** Kalles hvis opptaket når maks filstørrelse (ca. 6 timer). */
  onLimitReached: (() => void) | null = null

  constructor(private readonly engine: AudioEngine) {}

  get isRecording(): boolean {
    return this.node !== null
  }

  async start(): Promise<boolean> {
    if (this.node) return true
    const ctx = this.engine.ctx
    if (!this.moduleLoaded) {
      await ctx.audioWorklet.addModule(workletUrl)
      this.moduleLoaded = true
    }
    const ok = await window.mikseren.recordingStart(ctx.sampleRate, 2)
    if (!ok) return false
    const node = new AudioWorkletNode(ctx, 'mikseren-recorder', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit'
    })
    this.bytes = 0
    node.port.onmessage = (event: MessageEvent) => {
      if (!Array.isArray(event.data)) return
      const pcm = interleaveToPcm16(event.data as Float32Array[])
      this.bytes += pcm.byteLength
      window.mikseren.recordingChunk(pcm)
      if (this.bytes > WAV_MAX_DATA_BYTES - 10_000_000) this.onLimitReached?.()
    }
    // Noden må kobles til høyttalerne for å bli kjørt, men uten lyd.
    const mute = ctx.createGain()
    mute.gain.value = 0
    this.engine.master.output.connect(node)
    node.connect(mute).connect(ctx.destination)
    this.node = node
    this.mute = mute
    return true
  }

  /** Stopper opptaket og venter til de siste bitene er sendt. */
  async stop(): Promise<void> {
    const node = this.node
    if (!node) return
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1000)
      const previous = node.port.onmessage
      node.port.onmessage = (event: MessageEvent) => {
        if (event.data === 'flushed') {
          clearTimeout(timeout)
          resolve()
        } else previous?.call(node.port, event)
      }
      node.port.postMessage('flush')
    })
    this.engine.master.output.disconnect(node)
    node.disconnect()
    this.mute?.disconnect()
    this.node = null
    this.mute = null
  }
}
