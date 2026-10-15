/**
 * Matte for trim, EQ, filter og sikring mot klipping.
 * Alle knotter har verdi -1 … 1, der 0 er midtstilling (ingen endring).
 */

const clampUnit = (x: number): number => (x < -1 ? -1 : x > 1 ? 1 : x)

/** Trim (gain): ±12 dB. */
export const TRIM_RANGE_DB = 12

export function trimDb(value: number): number {
  return clampUnit(value) * TRIM_RANGE_DB
}

/** EQ: helt ned gir «kill» (ca. -26 dB), helt opp gir +6 dB. */
export const EQ_KILL_DB = -26
export const EQ_BOOST_DB = 6

export function eqDb(value: number): number {
  const v = clampUnit(value)
  return v < 0 ? -v * EQ_KILL_DB : v * EQ_BOOST_DB
}

/** Frekvensene til EQ-båndene. */
export const EQ_FREQUENCIES = { low: 180, mid: 1000, high: 3500 } as const
export const EQ_MID_Q = 0.8

export type EqBand = keyof typeof EQ_FREQUENCIES

/** Filterknotten gjør ingenting så nær midten. */
export const FILTER_DEAD_ZONE = 0.03

export interface FilterSettings {
  /** Lavpass: fjerner diskant (venstre side av knotten). */
  lowpassHz: number
  /** Høypass: fjerner bass (høyre side av knotten). */
  highpassHz: number
}

const FILTER_OPEN_LOW = 20
const FILTER_OPEN_HIGH = 20000
/** Hvor langt filteret går helt ute på hver side. */
const LOWPASS_MIN_HZ = 120
const HIGHPASS_MAX_HZ = 7000

/** Logaritmisk mellom to frekvenser, så knotten føles jevn for øret. */
function logBetween(from: number, to: number, t: number): number {
  return from * Math.pow(to / from, t)
}

/**
 * Filterknotten: venstre = lavpass (lyden blir mørk og dempet),
 * midten = av, høyre = høypass (lyden blir tynn, bassen forsvinner).
 */
export function filterSettings(value: number): FilterSettings {
  const v = clampUnit(value)
  if (Math.abs(v) < FILTER_DEAD_ZONE) return { lowpassHz: FILTER_OPEN_HIGH, highpassHz: FILTER_OPEN_LOW }
  const amount = (Math.abs(v) - FILTER_DEAD_ZONE) / (1 - FILTER_DEAD_ZONE)
  return v < 0
    ? { lowpassHz: logBetween(FILTER_OPEN_HIGH, LOWPASS_MIN_HZ, amount), highpassHz: FILTER_OPEN_LOW }
    : { lowpassHz: FILTER_OPEN_HIGH, highpassHz: logBetween(FILTER_OPEN_LOW, HIGHPASS_MAX_HZ, amount) }
}

/**
 * Siste sikring etter limiteren: lar alt under -1 dB være i fred, og runder
 * mykt av toppene over, så lyden aldri går over 0 dBFS.
 */
export const SAFETY_KNEE = 0.89

export function safetyCurve(x: number): number {
  const a = Math.abs(x)
  if (a <= SAFETY_KNEE) return x
  // Taket ligger rett under 0 dBFS.
  const room = 0.999 - SAFETY_KNEE
  const over = a - SAFETY_KNEE
  const y = SAFETY_KNEE + room * Math.tanh(over / room)
  return Math.sign(x) * y
}

/** Lager kurven til WaveShaperNode for sikringen. */
export function makeSafetyCurve(points = 4097): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points)
  for (let i = 0; i < points; i++) {
    // WaveShaper-kurven går fra -1 til 1. Vi gir den litt mer rom (±2) med en skalering i lydkjeden.
    const x = ((i / (points - 1)) * 2 - 1) * 2
    curve[i] = safetyCurve(x)
  }
  return curve
}
