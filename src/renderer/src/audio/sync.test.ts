import { describe, expect, it } from 'vitest'
import { alignedPosition, beatMultiplier, beatsAt, effectiveBpm, matchPitch, phaseOffset, wrapHalf } from './sync'

describe('tempo', () => {
  it('regner ut tempo med pitch', () => {
    expect(effectiveBpm(120, 0.05)).toBeCloseTo(126)
    expect(effectiveBpm(128, -0.08)).toBeCloseTo(117.76)
  })

  it('finner pitch som matcher den andre decken', () => {
    const m = matchPitch(120, 124)!
    expect(m.multiplier).toBe(1)
    expect(effectiveBpm(120, m.pitch)).toBeCloseTo(124)
  })

  it('bruker halvt eller dobbelt tempo når det passer', () => {
    expect(matchPitch(70, 140)).toEqual({ pitch: 0, multiplier: 0.5 })
    expect(matchPitch(174, 87)).toEqual({ pitch: 0, multiplier: 2 })
  })

  it('gir null når forskjellen er større enn tempo-slideren', () => {
    expect(matchPitch(100, 128)).toBeNull()
  })

  it('finner forholdet mellom slagene', () => {
    expect(beatMultiplier(124, 125)).toBe(1)
    expect(beatMultiplier(70, 140)).toBe(0.5)
    expect(beatMultiplier(172, 87)).toBe(2)
  })
})

describe('slag og fase', () => {
  const grid = { bpm: 120, firstBeat: 0.25 }

  it('teller slag fra rutenettet', () => {
    expect(beatsAt(0.25, grid)).toBe(0)
    expect(beatsAt(1.25, grid)).toBe(2)
    expect(beatsAt(0, grid)).toBe(-0.5)
  })

  it('pakker forskjeller inn i ±0,5 slag', () => {
    expect(wrapHalf(0.75)).toBeCloseTo(-0.25)
    expect(wrapHalf(-0.6)).toBeCloseTo(0.4)
    expect(wrapHalf(3.1)).toBeCloseTo(0.1)
  })

  it('flytter til nærmeste posisjon der slagene ligger oppå hverandre', () => {
    // Den andre decken er 0,3 slag inn i et slag. Vi står på et slag.
    const pos = alignedPosition(10.25, grid, 7.3, 1)
    expect(pos).toBeCloseTo(10.25 + 0.3 * 0.5)
    expect(phaseOffset(beatsAt(pos, grid), 7.3, 1)).toBeCloseTo(0)
  })

  it('flytter bakover når det er kortest', () => {
    const pos = alignedPosition(10.25, grid, 7.8, 1)
    expect(pos).toBeCloseTo(10.25 - 0.2 * 0.5)
  })

  it('går aldri før starten av låten', () => {
    expect(alignedPosition(0.05, { bpm: 120, firstBeat: 0 }, 0.6, 1)).toBeGreaterThanOrEqual(0)
  })

  it('viser hvem som ligger foran', () => {
    expect(phaseOffset(4.1, 9, 1)).toBeCloseTo(0.1)
    expect(phaseOffset(4.95, 9, 1)).toBeCloseTo(-0.05)
  })
})
