import { describe, expect, it } from 'vitest'
import { analyseMono, computeWaveform, detectBeatGrid, snapBpm } from './core'
import { makeBeat } from './testSignals'

/** Avstand mellom to tidspunkt i et rutenett, målt modulo slaglengden. */
function gridError(found: number, expected: number, beat: number): number {
  const d = (((found - expected) % beat) + beat) % beat
  return Math.min(d, beat - d)
}

const CASES = [
  { bpm: 120, offset: 0.37 },
  { bpm: 124, offset: 0.05, hats: true, bass: true },
  { bpm: 128, offset: 1.2, hats: true, noise: 0.05 },
  { bpm: 140, offset: 0.2, bass: true },
  { bpm: 174, offset: 0.61, hats: true },
  { bpm: 87.5, offset: 0.3, hats: true, bass: true },
  { bpm: 100.5, offset: 0.0, hats: true },
  { bpm: 96, offset: 0.8, noise: 0.1 }
]

describe('BPM og beatgrid', () => {
  for (const c of CASES) {
    it(`finner ${c.bpm} BPM og slagene`, () => {
      const { mono, sampleRate } = makeBeat({
        bpm: c.bpm,
        offset: c.offset,
        seconds: 60,
        offbeatHats: c.hats,
        bass: c.bass,
        noise: c.noise,
        seed: Math.round(c.bpm * 10)
      })
      const { grid } = detectBeatGrid(mono, sampleRate)
      expect(grid).not.toBeNull()
      expect(grid!.bpm).toBeCloseTo(c.bpm, 1)
      // Innenfor 10 ms er godt nok til å legge slagene oppå hverandre.
      expect(gridError(grid!.firstBeat, c.offset, 60 / c.bpm)).toBeLessThan(0.01)
    })
  }

  it('gir ikke beatgrid for stillhet eller jevn støy', () => {
    expect(detectBeatGrid(new Float32Array(22050 * 20), 22050).grid).toBeNull()
    let s = 7
    const noise = new Float32Array(22050 * 20).map(() => {
      s = (s * 1664525 + 1013904223) >>> 0
      return (s / 2 ** 32) * 2 - 1
    })
    expect(detectBeatGrid(noise, 22050).grid).toBeNull()
  })

  it('tåler veldig korte lydklipp', () => {
    expect(detectBeatGrid(new Float32Array(1000), 22050).grid).toBeNull()
  })
})

describe('avrunding av BPM', () => {
  it('runder av nær hele og halve tall', () => {
    expect(snapBpm(123.97)).toBe(124)
    expect(snapBpm(87.48)).toBe(87.5)
    expect(snapBpm(123.8)).toBe(123.8)
  })
})

describe('bølgeform', () => {
  it('har tre bånd per punkt og riktig lengde', () => {
    const { mono, sampleRate } = makeBeat({ bpm: 120, offset: 0, seconds: 4, offbeatHats: true })
    const wf = computeWaveform(mono, sampleRate, 100)
    expect(wf.length).toBe(400 * 3)
    expect(Math.max(...wf)).toBe(255)
  })

  it('legger kicken i bassen og hi-hat i diskanten', () => {
    const sr = 22050
    const { mono } = makeBeat({ bpm: 120, offset: 0, seconds: 4, offbeatHats: true, sampleRate: sr })
    const wf = computeWaveform(mono, sr, 100)
    const at = (seconds: number, band: number): number => wf[Math.round(seconds * 100) * 3 + band]
    // Kick på 1.0 s, hi-hat på 1.25 s.
    expect(at(1.02, 0)).toBeGreaterThan(at(1.02, 2))
    expect(at(1.255, 2)).toBeGreaterThan(at(1.255, 0))
  })

  it('analyseMono gir alt samlet', () => {
    const { mono, sampleRate } = makeBeat({ bpm: 126, offset: 0.1, seconds: 30 })
    const out = analyseMono(mono, sampleRate)
    expect(out.duration).toBeCloseTo(30)
    expect(out.grid?.bpm).toBe(126)
    expect(out.waveform.length).toBe(Math.ceil(30 * out.binsPerSecond) * 3)
  })
})
