/// <reference lib="webworker" />
import { analyseMono } from './core'

/** Kjører analysen i en egen tråd, så grensesnittet og lyden ikke hakker. */
interface Job {
  id: number
  mono: Float32Array
  sampleRate: number
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<Job>) => {
  const { id, mono, sampleRate } = event.data
  try {
    const result = analyseMono(mono, sampleRate)
    ctx.postMessage({ id, ok: true, result }, [result.waveform.buffer])
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: String(err) })
  }
}
