/** Matte for fadere og knotter. Ren logikk, så den kan testes. */

/** Hvor nær nullstillingsverdien (andel av hele området) kontrollen «hakker» seg fast. */
export const DETENT = 0.012

/**
 * Små «hakk» ved nullstillingsverdien (f.eks. midten av krysslideren eller 0 % tempo),
 * så det er lett å treffe den nøyaktig. Uten nullstillingsverdi: uendret.
 */
export function snapToDetent(value: number, detent: number | undefined, range: number): number {
  if (detent === undefined) return value
  return Math.abs(value - detent) <= DETENT * range ? detent : value
}

/** Myk glidning fra `from` til `to`. `t` går fra 0 til 1 (ease-out, rask start og myk landing). */
export function glideStep(from: number, to: number, t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1)
  const eased = 1 - Math.pow(1 - clamped, 3)
  return from + (to - from) * eased
}

/** Gjør om rullehjul-delta til piksler, uansett om nettleseren oppgir linjer eller sider. */
export function wheelPixels(delta: number, deltaMode: number): number {
  return delta * (deltaMode === 1 ? 16 : deltaMode === 2 ? 400 : 1)
}
