/** Resultatet av BPM- og bølgeformanalysen, delt mellom main og grensesnittet. */

/** Øk denne når analysen endres, så gamle resultater regnes ut på nytt. */
export const ANALYSIS_VERSION = 1

/** Hvor mange bølgeform-punkter per sekund (hvert punkt har bass, mellomtone og diskant). */
export const WAVEFORM_BINS_PER_SECOND = 150

export interface BeatGrid {
  /** Slag per minutt ved normal fart. */
  bpm: number
  /** Tidspunktet (sekunder) for et slag. Rutenettet går like langt bakover og fremover herfra. */
  firstBeat: number
}

export interface TrackAnalysis {
  version: number
  /** null hvis appen ikke fant noe tydelig tempo (f.eks. rolig musikk uten trommer). */
  grid: BeatGrid | null
  /** Hvor sikker analysen er, 0–1. */
  confidence: number
  duration: number
  binsPerSecond: number
}

/**
 * Bølgeform: tre bytes per punkt – [bass, mellomtone, diskant] – med verdier 0–255.
 */
export type WaveformBytes = Uint8Array
