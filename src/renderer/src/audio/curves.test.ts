import { describe, expect, it } from 'vitest'
import { crossfaderGains, dbToGain, faderGain, gainToDb } from './curves'

describe('krysslider (equal power)', () => {
  it('spiller bare A helt til venstre og bare B helt til høyre', () => {
    expect(crossfaderGains(0)).toEqual({ a: 1, b: 0 })
    expect(crossfaderGains(1)).toEqual({ a: 0, b: 1 })
  })

  it('har lik effekt i midten (ca. -3 dB hver)', () => {
    const { a, b } = crossfaderGains(0.5)
    expect(a).toBeCloseTo(Math.SQRT1_2, 6)
    expect(b).toBeCloseTo(Math.SQRT1_2, 6)
    expect(gainToDb(a)).toBeCloseTo(-3.01, 1)
  })

  it('holder total effekt konstant over hele bevegelsen', () => {
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const { a, b } = crossfaderGains(x)
      expect(a * a + b * b).toBeCloseTo(1, 6)
    }
  })

  it('tåler verdier utenfor 0–1', () => {
    expect(crossfaderGains(-2)).toEqual({ a: 1, b: 0 })
    expect(crossfaderGains(5)).toEqual({ a: 0, b: 1 })
  })
})

describe('volumfader', () => {
  it('går fra stille til fullt', () => {
    expect(faderGain(0)).toBe(0)
    expect(faderGain(1)).toBe(1)
  })

  it('øker jevnt', () => {
    let previous = -1
    for (let x = 0; x <= 1; x += 0.1) {
      const g = faderGain(x)
      expect(g).toBeGreaterThan(previous)
      previous = g
    }
  })
})

describe('dB-omregning', () => {
  it('går begge veier', () => {
    expect(gainToDb(1)).toBe(0)
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3)
    expect(gainToDb(dbToGain(-26))).toBeCloseTo(-26, 6)
    expect(gainToDb(0)).toBe(-Infinity)
  })
})
