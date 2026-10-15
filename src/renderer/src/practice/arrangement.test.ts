import { describe, expect, it } from 'vitest'
import { durationSeconds, partsFor, PRACTICE_BEATS, sectionOfBar, TOTAL_BARS } from './arrangement'

describe('øvelses-beats', () => {
  it('har tempo 120 og 124, og er rundt tre minutter', () => {
    expect(PRACTICE_BEATS[1].bpm).toBe(120)
    expect(PRACTICE_BEATS[2].bpm).toBe(124)
    for (const spec of Object.values(PRACTICE_BEATS)) {
      expect(durationSeconds(spec)).toBeGreaterThan(160)
      expect(durationSeconds(spec)).toBeLessThan(200)
    }
  })

  it('starter og slutter med bare trommer, og har et break i midten', () => {
    expect(sectionOfBar(0)).toBe('intro')
    expect(sectionOfBar(8)).toBe('main')
    expect(sectionOfBar(40)).toBe('breakdown')
    expect(sectionOfBar(TOTAL_BARS - 1)).toBe('outro')
    expect(partsFor('intro')).toMatchObject({ kick: true, bass: false })
    expect(partsFor('breakdown').kick).toBe(false)
  })
})
