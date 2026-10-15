import { create } from 'zustand'
import { defaultSettings, type Settings } from '@shared/settings'

/** Innstillinger og læringsfremgang. Endres bare via dispatch(). */
export const useSettingsStore = create<Settings & { loaded: boolean }>()(() => ({
  ...defaultSettings(),
  loaded: false
}))

export function applySettings(settings: Settings): void {
  useSettingsStore.setState({ ...settings, loaded: true })
}

/** Endrer innstillinger her med en gang, og lagrer dem i bakgrunnen. */
export function patchSettings(patch: Partial<Settings>): void {
  useSettingsStore.setState(patch)
  void window.mikseren.updateSettings(patch).then(applySettings)
}
