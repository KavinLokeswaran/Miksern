/** Cue-punkt og hot cues for én låt. Lagres per låt. */
export const HOT_CUE_COUNT = 4

export interface TrackCues {
  /** Hovedcue (der Cue-knappen går tilbake til), i sekunder. */
  cue: number | null
  /** Hot cues 1–4, i sekunder (null = tom). */
  hot: (number | null)[]
}

export function emptyCues(): TrackCues {
  return { cue: null, hot: Array.from({ length: HOT_CUE_COUNT }, () => null) }
}

const isTime = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0)

/** Sjekker at data utenfra faktisk er gyldige cues. */
export function parseCues(value: unknown): TrackCues | null {
  if (!value || typeof value !== 'object') return null
  const v = value as TrackCues
  if (!isTime(v.cue) || !Array.isArray(v.hot) || v.hot.length !== HOT_CUE_COUNT || !v.hot.every(isTime)) return null
  return { cue: v.cue, hot: [...v.hot] }
}
