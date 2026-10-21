import { describe, expect, it } from 'vitest'
import { DETENT, glideStep, snapToDetent, wheelPixels } from './controlMath'

describe('hakk ved nullstillingsverdien', () => {
  it('fester seg når den er nær nok', () => {
    expect(snapToDetent(0.505, 0.5, 1)).toBe(0.5)
    expect(snapToDetent(0.5 - DETENT * 0.9, 0.5, 1)).toBe(0.5)
  })

  it('slipper når den er langt nok unna', () => {
    expect(snapToDetent(0.53, 0.5, 1)).toBe(0.53)
  })

  it('skalerer med området (tempo-slideren er bare ±0,08)', () => {
    expect(snapToDetent(0.001, 0, 0.16)).toBe(0)
    expect(snapToDetent(0.01, 0, 0.16)).toBe(0.01)
  })

  it('gjør ingenting uten nullstillingsverdi', () => {
    expect(snapToDetent(0.501, undefined, 1)).toBe(0.501)
  })
})

describe('glidning', () => {
  it('starter og slutter riktig', () => {
    expect(glideStep(0.2, 0.8, 0)).toBe(0.2)
    expect(glideStep(0.2, 0.8, 1)).toBeCloseTo(0.8, 9)
  })

  it('beveger seg raskest i starten', () => {
    expect(glideStep(0, 1, 0.5)).toBeGreaterThan(0.5)
  })
})

describe('rullehjul', () => {
  it('regner om linjer og sider til piksler', () => {
    expect(wheelPixels(10, 0)).toBe(10)
    expect(wheelPixels(3, 1)).toBe(48)
    expect(wheelPixels(1, 2)).toBe(400)
  })
})
