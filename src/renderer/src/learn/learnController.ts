import type { Action } from '../actions/types'
import { clippedRecently } from '../ui/clipMonitor'
import { useLibraryStore } from '../state/libraryStore'
import { useLearnStore } from '../state/learnStore'
import { patchSettings, useSettingsStore } from '../state/settingsStore'
import { useAppStore } from '../state/store'
import { GROUP_INFO, groupsUnlockedBy } from './controlGroups'
import { TourRunner } from './tourRunner'
import { tourById } from './tours'
import type { TourSnapshot } from './tourTypes'

/**
 * Kobler grunnkurs og leksjoner til appen: lytter på alle handlinger og på
 * tilstanden, og går videre når brukeren har gjort det steget ber om.
 */

/** Hvor lenge «Bra! ✓» vises før neste steg. */
const SUCCESS_MS = 1100
/** Hvor ofte tilstanden sjekkes (for ting som ikke er handlinger, f.eks. klipping). */
const POLL_MS = 250

let runner: TourRunner | null = null
let successTimer: number | undefined
let pollTimer: number | undefined
let toastTimer: number | undefined
let toastId = 0
/** Settes av dispatch, så kontrolleren kan kjøre knappe-handlinger uten å importere dispatch direkte. */
let run: ((action: Action) => Promise<void>) | null = null

export function snapshot(): TourSnapshot {
  const library = useLibraryStore.getState()
  return {
    app: useAppStore.getState(),
    library: { folder: library.folder, trackCount: library.tracks.filter((t) => t.status === 'ok').length },
    practiceChosen: useLearnStore.getState().practiceChosen,
    clipping: {
      A: clippedRecently('A', 1500),
      B: clippedRecently('B', 1500),
      master: clippedRecently('master', 1500)
    }
  }
}

function publish(success = false): void {
  useLearnStore.setState({
    active: runner ? { tourId: runner.tour.id, step: runner.stepIndex, success } : null
  })
}

function evaluate(action: Action | null): void {
  if (!runner || useLearnStore.getState().active?.success) return
  if (!runner.check({ action, snap: snapshot() })) return
  publish(true)
  window.clearTimeout(successTimer)
  successTimer = window.setTimeout(goNext, SUCCESS_MS)
}

function enterStep(): void {
  if (!runner) return
  publish(false)
  const onEnter = runner.step.onEnter ?? []
  void (async () => {
    for (const action of onEnter) await run?.(action)
    evaluate(null)
  })()
}

function goNext(): void {
  window.clearTimeout(successTimer)
  if (!runner) return
  if (runner.next()) enterStep()
  else finish(true)
}

function showToast(title: string, text: string): void {
  useLearnStore.setState({ toast: { id: ++toastId, title, text } })
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => useLearnStore.setState({ toast: null }), 7000)
}

function finish(completed: boolean): void {
  window.clearTimeout(successTimer)
  window.clearInterval(pollTimer)
  const tour = runner?.tour
  runner = null
  publish()
  if (!tour) return
  if (tour.id === 'intro') {
    patchSettings({ introDone: true })
    return
  }
  if (!completed) return
  const settings = useSettingsStore.getState()
  if (!settings.completedLessons.includes(tour.id)) {
    patchSettings({ completedLessons: [...settings.completedLessons, tour.id] })
    if (!settings.advancedMode) {
      const labels = groupsUnlockedBy(tour.id).map((g) => GROUP_INFO[g].label)
      showToast('Ny kontroll låst opp!', `${labels.join(' og ')} er nå synlig i Enkel modus.`)
    }
  }
}

function start(tourId: string): void {
  const tour = tourById(tourId)
  if (!tour) return
  window.clearTimeout(successTimer)
  runner = new TourRunner(tour)
  useLearnStore.setState({ menuOpen: false })
  window.clearInterval(pollTimer)
  pollTimer = window.setInterval(() => evaluate(null), POLL_MS)
  enterStep()
}

/** Håndterer learn/*-handlingene (kalles fra dispatch). */
export function handleLearnAction(action: Action): void {
  switch (action.type) {
    case 'learn/start':
      start(action.tour)
      break
    case 'learn/next':
    case 'learn/skip':
      goNext()
      break
    case 'learn/back':
      if (!runner) return
      window.clearTimeout(successTimer)
      runner.back()
      publish(false)
      break
    case 'learn/exit':
      finish(false)
      break
    case 'learn/choosePractice':
      useLearnStore.setState({ practiceChosen: true })
      evaluate(null)
      break
    case 'learn/menu':
      useLearnStore.setState({ menuOpen: action.open })
      break
    case 'learn/dismissToast':
      window.clearTimeout(toastTimer)
      useLearnStore.setState({ toast: null })
      break
  }
}

/** Kjører knappene i et steg (f.eks. «Spill øvelses-beat 1 på A»). */
export async function runStepActions(actions: Action[]): Promise<void> {
  for (const action of actions) await run?.(action)
}

/**
 * Starter læringsdelen: lytter på alle handlinger, og starter grunnkurset
 * første gang appen brukes. Kalles én gang ved oppstart.
 */
export function initLearning(
  dispatch: (action: Action) => Promise<void>,
  onAction: (listener: (action: Action) => void) => void
): void {
  run = dispatch
  onAction((action) => {
    if (!action.type.startsWith('learn/')) evaluate(action)
  })
  void window.mikseren.getSettings().then((settings) => {
    useSettingsStore.setState({ ...settings, loaded: true })
    if (!settings.introDone) start('intro')
  })
}
