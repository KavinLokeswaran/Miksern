import { dispatch } from './actions/dispatch'
import { getEngine } from './audio/AudioEngine'
import { useLearnStore } from './state/learnStore'
import { useLibraryStore } from './state/libraryStore'
import { useSettingsStore } from './state/settingsStore'
import { useAppStore } from './state/store'

/** Kun i utviklingsmodus: verktøy for automatiske sjekker. */
export function exposeDebug(): void {
  Object.assign(window, {
    __mikseren: {
      dispatch,
      engine: getEngine(),
      store: useAppStore,
      library: useLibraryStore,
      learn: useLearnStore,
      settings: useSettingsStore
    }
  })
}
