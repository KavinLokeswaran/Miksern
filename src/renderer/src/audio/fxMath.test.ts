import { describe, expect, it } from 'vitest'
import { echoDelaySeconds, echoSettings, makeImpulseResponse } from './fxMath'

describe('echo', () => {
  it('følger tempoet: et halvt slag', () => {
    expect(echoDelaySeconds(120)).toBeCloseTo(0.25)
    expect(echoDelaySeconds(128)).toBeCloseTo(0.234375)
  })

  it('bruker 120 BPM hvis tempoet er ukjent', () => {
    expect(echoDelaySeconds(null)).toBeCloseTo(0.25)
  })

  it('mer mengde gir mer ekko, men aldri uendelig', () => {
    const lo = echoSettings(0)
    const hi = echoSettings(1)
    expect(hi.send).toBeGreaterThan(lo.send)
    expect(hi.feedback).toBeGreaterThan(lo.feedback)
    expect(hi.feedback).toBeLessThan(0.8)
  })
})

describe('romklang', () => {
  it('lager to kanaler som er ulike (stereo)', () => {
    const [l, r] = makeImpulseResponse(8000, 2)
    expect(l.length).toBe(16000)
    expect(l[100]).not.toBe(r[100])
  })

  it('dør ut over tid', () => {
    const [l] = makeImpulseResponse(8000, 2)
    const energy = (from: number, to: number): number => {
      let s = 0
      for (let i = from; i < to; i++) s += l[i] * l[i]
      return s
    }
    expect(energy(0, 1000)).toBeGreaterThan(energy(15000, 16000) * 100)
  })
})
