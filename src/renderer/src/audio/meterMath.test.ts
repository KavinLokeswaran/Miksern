import { describe, expect, it } from 'vitest'
import { CLIP_LEVEL, measure, meterFraction } from './meterMath'

describe('nivåmåling', () => {
  it('finner topp og RMS', () => {
    const level = measure(new Float32Array([0, 0.5, -1, 0.5]))
    expect(level.peak).toBe(1)
    expect(level.rms).toBeCloseTo(Math.sqrt((0.25 + 1 + 0.25) / 4))
    expect(level.peak >= CLIP_LEVEL).toBe(true)
  })

  it('gir tom måler for stillhet og full måler over 0 dB', () => {
    expect(meterFraction(0)).toBe(0)
    expect(meterFraction(2)).toBe(1)
    const half = meterFraction(0.1)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(1)
  })
})
