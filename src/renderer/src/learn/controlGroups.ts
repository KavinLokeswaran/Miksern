/**
 * KONTROLLGRUPPER OG SYNLIGHET
 *
 * I Enkel modus er noen kontrollgrupper skjult til brukeren har fullført
 * leksjonen for dem. Dette er det ene stedet som bestemmer hva som vises.
 */

/** Leksjonene, i rekkefølge. */
export const LESSON_IDS = ['eq-filter', 'trim-levels', 'cues', 'loops', 'fx', 'recording'] as const
export type LessonId = (typeof LESSON_IDS)[number]

export const CONTROL_GROUPS = ['eq', 'filter', 'trim', 'hotcues', 'loops', 'fx', 'recording'] as const
export type ControlGroup = (typeof CONTROL_GROUPS)[number]

export const GROUP_INFO: Record<ControlGroup, { label: string; lesson: LessonId }> = {
  eq: { label: 'EQ (bass, mellomtone og diskant)', lesson: 'eq-filter' },
  filter: { label: 'Filter', lesson: 'eq-filter' },
  trim: { label: 'Trim (gain)', lesson: 'trim-levels' },
  hotcues: { label: 'Hot cues', lesson: 'cues' },
  loops: { label: 'Loops', lesson: 'loops' },
  fx: { label: 'Effekter', lesson: 'fx' },
  recording: { label: 'Opptak', lesson: 'recording' }
}

export interface VisibilityInput {
  advancedMode: boolean
  completedLessons: readonly string[]
  /** Leksjonen som pågår nå (kontrollene den lærer bort må synes). */
  activeLesson: string | null
}

export function isGroupVisible(group: ControlGroup, input: VisibilityInput): boolean {
  if (input.advancedMode) return true
  const lesson = GROUP_INFO[group].lesson
  return input.completedLessons.includes(lesson) || input.activeLesson === lesson
}

/** Kontrollgruppene en leksjon låser opp. */
export function groupsUnlockedBy(lesson: string): ControlGroup[] {
  return CONTROL_GROUPS.filter((g) => GROUP_INFO[g].lesson === lesson)
}
