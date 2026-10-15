import { describe, expect, it } from 'vitest'
import { eqDb, filterSettings, makeSafetyCurve, safetyCurve, trimDb } from './toneMath'

describe('trim og EQ', () => {
  it('trim går fra -12 til +12 dB', () => {
    expect(trimDb(-1)).toBe(-12)
    expect(trimDb(0)).toBe(0)
    expect(trimDb(0.5)).toBe(6)
    expect(trimDb(3)).toBe(12)
  })

  it('EQ: midten er nøytral, helt ned er kill, helt opp er +6 dB', () => {
    expect(eqDb(0)).toBe(0)
    expect(eqDb(-1)).toBe(-26)
    expect(eqDb(-0.5)).toBe(-13)
    expect(eqDb(1)).toBe(6)
  })
})

describe('filterknott', () => {
  it('gjør ingenting i midten', () => {
    expect(filterSettings(0)).toEqual({ lowpassHz: 20000, highpassHz: 20 })
    expect(filterSettings(0.02)).toEqual({ lowpassHz: 20000, highpassHz: 20 })
  })

  it('venstre gir lavpass som blir dypere jo lenger ut', () => {
    const a = filterSettings(-0.3)
    const b = filterSettings(-1)
    expect(a.highpassHz).toBe(20)
    expect(a.lowpassHz).toBeLessThan(20000)
    expect(b.lowpassHz).toBeCloseTo(120)
    expect(b.lowpassHz).toBeLessThan(a.lowpassHz)
  })

  it('høyre gir høypass som fjerner mer bass jo lenger ut', () => {
    const a = filterSettings(0.3)
    const b = filterSettings(1)
    expect(a.lowpassHz).toBe(20000)
    expect(b.highpassHz).toBeCloseTo(7000)
    expect(b.highpassHz).toBeGreaterThan(a.highpassHz)
  })
})

describe('sikring mot klipping', () => {
  it('lar normale nivåer være helt i fred', () => {
    expect(safetyCurve(0.5)).toBe(0.5)
    expect(safetyCurve(-0.89)).toBe(-0.89)
  })

  it('går aldri over 0 dBFS, selv med veldig høye toppnivåer', () => {
    for (const x of [0.95, 1, 1.5, 2, 10]) {
      expect(safetyCurve(x)).toBeLessThan(1)
      expect(safetyCurve(-x)).toBeGreaterThan(-1)
    }
  })

  it('er jevn og stigende (ingen hopp)', () => {
    const curve = makeSafetyCurve(1001)
    for (let i = 1; i < curve.length; i++) expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1])
    expect(curve[500]).toBeCloseTo(0)
  })
})
