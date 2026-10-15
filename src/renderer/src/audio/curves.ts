/** Matte for fadere og krysslider. Alle verdier inn er 0–1. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

/**
 * Krysslider (crossfader) med jevn kurve (equal power).
 * 0 = bare A, 0.5 = begge like mye, 1 = bare B.
 * Summen av effekten (gainA² + gainB²) er alltid 1, så lyden ikke synker i midten.
 */
export function crossfaderGains(position: number): { a: number; b: number } {
  const x = clamp01(position)
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
