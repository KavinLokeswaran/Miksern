/** WAV-filhode for vanlig PCM-lyd (16 bit). */
export const WAV_HEADER_BYTES = 44

/** WAV-filer kan ikke være større enn 4 GB. */
export const WAV_MAX_DATA_BYTES = 0xffffffff - WAV_HEADER_BYTES - 1024

export function wavHeader(sampleRate: number, channels: number, dataBytes: number, bitsPerSample = 16): Uint8Array {
  const header = new Uint8Array(WAV_HEADER_BYTES)
  const view = new DataView(header.buffer)
  const ascii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) header[offset + i] = text.charCodeAt(i)
  }
  const blockAlign = (channels * bitsPerSample) / 8
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  ascii(36, 'data')
  view.setUint32(40, dataBytes, true)
  return header
}

/** Gjør om flyttall (-1 … 1) for venstre og høyre til 16-bit PCM, flettet sammen (L R L R …). */
export function interleaveToPcm16(channels: Float32Array[]): Uint8Array {
  const frames = channels[0]?.length ?? 0
  const count = channels.length
  const out = new Int16Array(frames * count)
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < count; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]))
      out[i * count + c] = v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff)
    }
  }
  return new Uint8Array(out.buffer)
}
