import { useLearnStore } from '../state/learnStore'
import { useSettingsStore } from '../state/settingsStore'
import { isGroupVisible, type ControlGroup } from './controlGroups'

/** Skal denne kontrollgruppen vises nå? */
export function useGroupVisible(group: ControlGroup): boolean {
  const advancedMode = useSettingsStore((s) => s.advancedMode)
  const completedLessons = useSettingsStore((s) => s.completedLessons)
  const activeLesson = useLearnStore((s) => (s.active && s.active.tourId !== 'intro' ? s.active.tourId : null))
  return isGroupVisible(group, { advancedMode, completedLessons, activeLesson })
}
