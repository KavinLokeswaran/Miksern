import { describe, expect, it } from 'vitest'
import {
  approach,
  MAX_NUDGE,
  MAX_SCRATCH_RATE,
  nudgeFromSpin,
  PLATTER_TURNS_PER_SECOND,
  platterAngle,
  scratchRate,
  turnDelta,
  turnsToSeconds
} from './jogMath'

describe('platen', () => {
  it('går 33⅓ runder i minuttet', () => {
    expect(PLATTER_TURNS_PER_SECOND * 60).toBeCloseTo(33.333, 3)
    expect(turnsToSeconds(PLATTER_TURNS_PER_SECOND)).toBeCloseTo(1, 9)
  })

  it('står i riktig vinkel', () => {
    expect(platterAngle(0)).toBe(0)
    expect(platterAngle(0.9)).toBeCloseTo(180, 6)
    expect(platterAngle(1.8 + 0.45)).toBeCloseTo(90, 6)
    expect(platterAngle(0.45)).toBeCloseTo(90, 6)
  })

  it('finner korteste vei mellom to vinkler', () => {
    expect(turnDelta(0, Math.PI / 2)).toBeCloseTo(0.25, 9)
    expect(turnDelta(Math.PI / 2, 0)).toBeCloseTo(-0.25, 9)
    // Over skjøten ved ±π: et lite steg, ikke nesten en hel runde.
    expect(turnDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2 / (2 * Math.PI), 9)
  })
})

describe('scratch', () => {
  it('står stille når lyden er der hånda er', () => {
    expect(scratchRate(10, 10)).toBe(0)
  })

  it('drar fremover og bakover etter hånda', () => {
    expect(scratchRate(10.01, 10)).toBeGreaterThan(0)
    expect(scratchRate(9.99, 10)).toBeLessThan(0)
  })

  it('har en øvre fart', () => {
    expect(scratchRate(20, 10)).toBe(MAX_SCRATCH_RATE)
    expect(scratchRate(0, 10)).toBe(-MAX_SCRATCH_RATE)
  })
})

describe('skyv (nudge)', () => {
  it('skyver i samme retning som kanten dreies, men ikke for mye', () => {
    expect(nudgeFromSpin(0)).toBe(0)
    expect(nudgeFromSpin(0.5)).toBeGreaterThan(0)
    expect(nudgeFromSpin(-0.5)).toBeLessThan(0)
    expect(nudgeFromSpin(100)).toBe(MAX_NUDGE)
  })

  it('glatter ut mot målet', () => {
    const next = approach(0, 1, 0.016, 0.05)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1)
    expect(approach(0, 1, 10, 0.05)).toBeCloseTo(1, 6)
  })
})
