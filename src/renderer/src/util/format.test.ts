import { describe, expect, it } from 'vitest'
import { formatBpm, formatPitch, formatRemaining, formatTime } from './format'

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

describe('BPM og tempo', () => {
  it('bruker norsk komma', () => {
    expect(formatBpm(124)).toBe('124,0')
    expect(formatBpm(87.46)).toBe('87,5')
  })

  it('viser tempoendring med fortegn', () => {
    expect(formatPitch(0.024)).toBe('+2,4 %')
    expect(formatPitch(-0.08)).toBe('−8,0 %')
    expect(formatPitch(0.00001)).toBe('0,0 %')
  })
})
