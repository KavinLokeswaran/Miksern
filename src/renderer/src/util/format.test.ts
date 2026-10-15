import { describe, expect, it } from 'vitest'
import { formatRemaining, formatTime } from './format'

describe('tidsformat', () => {
  it('viser minutter og sekunder', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(67.9)).toBe('1:07')
    expect(formatTime(3600)).toBe('60:00')
  })

  it('tåler rare verdier', () => {
    expect(formatTime(-5)).toBe('0:00')
    expect(formatTime(Number.NaN)).toBe('0:00')
  })

  it('viser tid igjen', () => {
    expect(formatRemaining(10, 190)).toBe('-3:00')
    expect(formatRemaining(189.5, 190)).toBe('-0:01')
    expect(formatRemaining(200, 190)).toBe('-0:00')
  })
})
