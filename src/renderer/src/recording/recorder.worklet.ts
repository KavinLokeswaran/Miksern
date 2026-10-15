/**
 * AudioWorklet som tar opp det som går ut av master. Lyden samles i blokker
 * og sendes til hovedtråden, som sender den videre til opptaksfila.
 */

// Minimale typer for AudioWorklet (finnes ikke i TypeScript sine standardtyper).
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: new () => AudioWorkletProcessor): void

const BLOCK = 8192

class RecorderProcessor extends AudioWorkletProcessor {
  private left = new Float32Array(BLOCK)
  private right = new Float32Array(BLOCK)
  private filled = 0

  constructor() {
    super()
    this.port.onmessage = (event: MessageEvent) => {
      if (event.data === 'flush') {
        this.flush()
        this.port.postMessage('flushed')
      }
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]
    const frames = input?.[0]?.length ?? 128
    for (let i = 0; i < frames; i++) {
      this.left[this.filled] = input?.[0]?.[i] ?? 0
      this.right[this.filled] = input?.[1]?.[i] ?? input?.[0]?.[i] ?? 0
      this.filled++
      if (this.filled === BLOCK) this.flush()
    }
    return true
  }

  private flush(): void {
    if (this.filled === 0) return
    const left = this.left.slice(0, this.filled)
    const right = this.right.slice(0, this.filled)
    this.port.postMessage([left, right], [left.buffer, right.buffer])
    this.filled = 0
  }
}

registerProcessor('mikseren-recorder', RecorderProcessor)
