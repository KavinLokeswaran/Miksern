import { describe, expect, it } from 'vitest'
import { Playhead } from './playhead'

describe('Playhead', () => {
  it('står stille før start', () => {
    const p = new Playhead()
    expect(p.position(10)).toBe(0)
  })

  it('teller fremover mens den går', () => {
    const p = new Playhead()
    p.start(5, 100)
    expect(p.position(102.5)).toBeCloseTo(7.5)
  })

  it('husker posisjonen ved pause', () => {
    const p = new Playhead()
    p.start(0, 0)
    expect(p.stop(3)).toBeCloseTo(3)
    expect(p.position(50)).toBeCloseTo(3)
  })

  it('tar hensyn til tempoendring midt i', () => {
    const p = new Playhead()
    p.start(0, 0)
    p.setRate(1.08, 10) // 10 s i normal fart
    expect(p.position(20)).toBeCloseTo(10 + 10 * 1.08)
  })

  it('kan flyttes mens den går', () => {
    const p = new Playhead()
    p.start(0, 0)
    p.set(60, 5)
    expect(p.position(6)).toBeCloseTo(61)
    expect(p.isRunning).toBe(true)
  })
})
