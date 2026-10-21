/** Matte for fadere og krysslider. Alle verdier inn er 0–1. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

/**
 * Kurven på krysslideren:
 * - 'smooth': jevn overgang over hele bevegelsen (for vanlige overganger).
 * - 'sharp': begge spiller fullt nesten hele veien, og den ene kuttes helt ute i kanten (for scratch).
 */
export type CrossfaderCurve = 'smooth' | 'sharp'

/** Hvor nær kanten den skarpe kurven kutter (andel av bevegelsen). */
const SHARP_EDGE = 0.05

/**
 * Krysslider (crossfader). 0 = bare A, 0.5 = begge, 1 = bare B.
 * Den jevne kurven er «equal power»: summen av effekten (gainA² + gainB²) er alltid 1,
 * så lyden ikke synker i midten.
 */
export function crossfaderGains(position: number, curve: CrossfaderCurve = 'smooth'): { a: number; b: number } {
  const x = clamp01(position)
  if (curve === 'sharp') return { a: clamp01((1 - x) / SHARP_EDGE), b: clamp01(x / SHARP_EDGE) }
  const angle = (x * Math.PI) / 2
  // Runder av helt små tall, så endene blir helt stille.
  const a = Math.cos(angle)
  const b = Math.sin(angle)
  return { a: a < 1e-9 ? 0 : a, b: b < 1e-9 ? 0 : b }
}

/**
 * Volumfader: gjør om faderposisjon til forsterkning.
 * Kvadratisk kurve føles jevnere for øret enn en rett linje.
 */
export function faderGain(position: number): number {
  const x = clamp01(position)
  return x * x
}

export function gainToDb(gain: number): number {
  return gain <= 0 ? -Infinity : 20 * Math.log10(gain)
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20)
}
