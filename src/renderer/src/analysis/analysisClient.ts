import type { AnalysisOutput } from './core'

type Reply = { id: number; ok: true; result: AnalysisOutput } | { id: number; ok: false; error: string }

/** Sender analysejobber til en Web Worker og får svaret tilbake som et Promise. */
export class AnalysisWorker {
  private worker: Worker | null = null
  private nextId = 1
  private readonly pending = new Map<number, { resolve: (r: AnalysisOutput) => void; reject: (e: Error) => void }>()

  analyse(mono: Float32Array, sampleRate: number): Promise<AnalysisOutput> {
    const worker = this.ensureWorker()
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      worker.postMessage({ id, mono, sampleRate }, [mono.buffer])
    })
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<Reply>) => {
      const reply = event.data
      const job = this.pending.get(reply.id)
      if (!job) return
      this.pending.delete(reply.id)
      if (reply.ok) job.resolve(reply.result)
      else job.reject(new Error(reply.error))
    }
    worker.onerror = (event) => {
      for (const job of this.pending.values()) job.reject(new Error(event.message || 'Analysen krasjet'))
      this.pending.clear()
      worker.terminate()
      this.worker = null
    }
    this.worker = worker
    return worker
  }
}
