import { describe, expect, it } from 'vitest'
import { loopAt, loopLabel, nearestBeat, quantizedJump, resizeLoop, wrapInLoop } from './loopMath'

const grid = { bpm: 120, firstBeat: 0.1 } // ett slag = 0,5 s

describe('loops', () => {
  it('starter på slaget du nettopp passerte', () => {
    const loop = loopAt(10.3, grid, 4)
    expect(loop.start).toBeCloseTo(10.1)
    expect(loop.end).toBeCloseTo(12.1)
    expect(loop.beats).toBe(4)
  })

  it('regner et trykk rett før slaget som slaget', () => {
    expect(loopAt(10.595, grid, 1).start).toBeCloseTo(10.6)
  })

  it('halve slag starter på nærmeste halve slag', () => {
    const loop = loopAt(10.4, grid, 0.5)
    expect(loop.start).toBeCloseTo(10.35)
    expect(loop.end - loop.start).toBeCloseTo(0.25)
  })

  it('starter aldri før låten', () => {
    expect(loopAt(0.05, grid, 1).start).toBeGreaterThanOrEqual(0)
  })

  it('kan endre lengde og beholde starten', () => {
    const loop = resizeLoop(loopAt(10.3, grid, 4), grid, 16)
    expect(loop.start).toBeCloseTo(10.1)
    expect(loop.end).toBeCloseTo(18.1)
  })

  it('går rundt til starten når slutten er nådd', () => {
    const loop = { start: 10, end: 12, beats: 4 }
    expect(wrapInLoop(11, loop)).toBe(11)
    expect(wrapInLoop(12.5, loop)).toBeCloseTo(10.5)
    expect(wrapInLoop(17, loop)).toBeCloseTo(11)
    expect(wrapInLoop(9, loop)).toBe(9)
    expect(wrapInLoop(15, null)).toBe(15)
  })

  it('har lesbare navn', () => {
    expect(loopLabel(0.5)).toBe('1/2')
    expect(loopLabel(8)).toBe('8')
  })
})

describe('hopp i takt', () => {
  it('finner nærmeste slag', () => {
    expect(nearestBeat(30.33, grid)).toBeCloseTo(30.1)
    expect(nearestBeat(30.38, grid)).toBeCloseTo(30.6)
  })

  it('tar med seg hvor langt inn i slaget du er', () => {
    // Vi er 0,2 slag inn i et slag. Hot cue på 50,1 (et slag).
    const pos = quantizedJump(50.1, 20.2, grid)
    expect(pos).toBeCloseTo(50.2)
  })
})
