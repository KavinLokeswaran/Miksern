/** Samplingsfrekvens analysen trenger. Lavere enn avspilling, så det går raskere og bruker mindre minne. */
export const ANALYSIS_SAMPLE_RATE = 22050

/**
 * Lager en mono-versjon av lyden for analyse, og tar ned samplingsfrekvensen
 * (f.eks. 44,1 kHz → 22,05 kHz) ved å slå sammen nabopunkter.
 */
export function toAnalysisMono(
  channels: Float32Array[],
  sampleRate: number
): { mono: Float32Array; sampleRate: number } {
  const factor = Math.max(1, Math.floor(sampleRate / ANALYSIS_SAMPLE_RATE))
  const length = Math.floor((channels[0]?.length ?? 0) / factor)
  const mono = new Float32Array(length)
  const scale = 1 / (factor * Math.max(1, channels.length))
  for (const data of channels) {
    for (let i = 0; i < length; i++) {
      let sum = 0
      const start = i * factor
      for (let k = 0; k < factor; k++) sum += data[start + k]
      mono[i] += sum * scale
    }
  }
  return { mono, sampleRate: sampleRate / factor }
}

export function audioBufferChannels(buffer: AudioBuffer): Float32Array[] {
  return Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
}
