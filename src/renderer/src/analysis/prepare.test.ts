import { describe, expect, it } from 'vitest'
import { toAnalysisMono } from './prepare'

describe('klargjøring for analyse', () => {
  it('slår sammen kanaler og halverer 44,1 kHz', () => {
    const left = new Float32Array([1, 1, 0, 0])
    const right = new Float32Array([0, 0, 1, 1])
    const { mono, sampleRate } = toAnalysisMono([left, right], 44100)
    expect(sampleRate).toBe(22050)
    expect(Array.from(mono)).toEqual([0.5, 0.5])
  })

  it('lar 22,05 kHz mono være som den er', () => {
    const { mono, sampleRate } = toAnalysisMono([new Float32Array([0.1, 0.2, 0.3])], 22050)
    expect(sampleRate).toBe(22050)
    expect(mono[2]).toBeCloseTo(0.3)
  })
})
