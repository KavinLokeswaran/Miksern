/** Innstillinger og læringsfremgang som huskes mellom gangene appen brukes. */
export interface Settings {
  /** Avansert modus viser alle kontroller med en gang. */
  advancedMode: boolean
  /** Grunnkurset er fullført eller avsluttet (vises ikke av seg selv igjen). */
  introDone: boolean
  /** ID-ene til leksjonene som er fullført. */
  completedLessons: string[]
  /** Små tips underveis (kommer i fase 7). */
  tipsEnabled: boolean
  /** Tips som allerede er vist, så de ikke mases om. */
  shownTips: string[]
}

export function defaultSettings(): Settings {
  return { advancedMode: false, introDone: false, completedLessons: [], tipsEnabled: true, shownTips: [] }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Godtar bare gyldige felter fra data utenfra. Ukjente felter ignoreres. */
export function parseSettingsPatch(value: unknown): Partial<Settings> | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const patch: Partial<Settings> = {}
  if (typeof v.advancedMode === 'boolean') patch.advancedMode = v.advancedMode
  if (typeof v.introDone === 'boolean') patch.introDone = v.introDone
  if (typeof v.tipsEnabled === 'boolean') patch.tipsEnabled = v.tipsEnabled
  if (isStringArray(v.completedLessons)) patch.completedLessons = [...new Set(v.completedLessons)]
  if (isStringArray(v.shownTips)) patch.shownTips = [...new Set(v.shownTips)]
  return patch
}
