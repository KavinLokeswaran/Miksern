import type { Action } from '../actions/types'
import { getEngine } from '../audio/AudioEngine'
import { beatMultiplier, beatsAt, effectiveBpm, phaseOffset } from '../audio/sync'
import { isGroupVisible } from '../learn/controlGroups'
import { useLearnStore } from '../state/learnStore'
import { patchSettings, useSettingsStore } from '../state/settingsStore'
import { useAppStore, type AppState } from '../state/store'
import { clippedRecently } from '../ui/clipMonitor'
import { TipEngine, type Tip } from './tipEngine'
import type { TipContext } from './tipRules'
import { tipForAction } from './tipRules'
import { create } from 'zustand'

/** Tipset som vises nå (eller null). */
export const useTipStore = create<{ tip: Tip | null }>()(() => ({ tip: null }))

const CHECK_MS = 500
/** Et tips vises minst så lenge … */
const MIN_VISIBLE_S = 6
/** … og forsvinner av seg selv etter så lenge. */
const MAX_VISIBLE_S = 25

let engine: TipEngine | null = null
let shownAt = 0
let previous: AppState | null = null
const startedAt = performance.now()

const seconds = (): number => performance.now() / 1000

function context(): TipContext {
  const app = useAppStore.getState()
  const settings = useSettingsStore.getState()
  const audio = getEngine()
  const { A, B } = app.decks
  let offset: number | null = null
  if (A.grid && B.grid && audio.decks.A.isPlaying && audio.decks.B.isPlaying) {
    const m = beatMultiplier(effectiveBpm(B.grid.bpm, B.pitch), effectiveBpm(A.grid.bpm, A.pitch))
    offset = phaseOffset(beatsAt(audio.decks.B.position, B.grid), beatsAt(audio.decks.A.position, A.grid), m)
  }
  const activeLesson = useLearnStore.getState().active?.tourId ?? null
  return {
    app,
    phaseOffset: offset,
    clipping: { A: clippedRecently('A', 1200), B: clippedRecently('B', 1200), master: clippedRecently('master', 1200) },
    visible: (group) => isGroupVisible(group, { ...settings, activeLesson }),
    introDone: settings.introDone,
    completedLessons: settings.completedLessons,
    remaining: {
      A: audio.decks.A.duration - audio.decks.A.position,
      B: audio.decks.B.duration - audio.decks.B.position
    },
    uptime: (performance.now() - startedAt) / 1000
  }
}

/** Tips vises ikke mens et kurs pågår, eller hvis de er slått av. */
function allowed(): boolean {
  const settings = useSettingsStore.getState()
  return settings.loaded && settings.tipsEnabled && useLearnStore.getState().active === null
}

function show(tip: Tip): void {
  shownAt = seconds()
  useTipStore.setState({ tip })
  patchSettings({ shownTips: [...useSettingsStore.getState().shownTips, tip.id] })
}

function tick(): void {
  if (!engine) {
    if (!useSettingsStore.getState().loaded) return
    engine = new TipEngine(new Set(useSettingsStore.getState().shownTips))
  }
  const current = useTipStore.getState().tip
  if (!allowed()) {
    if (current) useTipStore.setState({ tip: null })
    return
  }
  const ctx = context()
  previous = ctx.app
  if (current) {
    const age = seconds() - shownAt
    // Skjul tipset når brukeren har gjort det det foreslo, eller når det har stått lenge nok.
    if (age > MAX_VISIBLE_S || (age > MIN_VISIBLE_S && !engine.stillRelevant(current.id, ctx))) {
      useTipStore.setState({ tip: null })
    }
    return
  }
  const tip = engine.update(ctx, seconds())
  if (tip) show(tip)
}

export function handleTipAction(action: Action): void {
  if (action.type === 'tips/dismiss') {
    useTipStore.setState({ tip: null })
    return
  }
  if (action.type === 'settings/resetTips') {
    engine = new TipEngine(new Set())
    useTipStore.setState({ tip: null })
  }
}

/** Starter tipsene. Lytter på tilstanden og på alle handlinger. */
export function initTips(onAction: (listener: (action: Action) => void) => void): void {
  window.setInterval(tick, CHECK_MS)
  onAction((action) => {
    const after = useAppStore.getState()
    const before = previous
    previous = after
    if (!engine || !before || !allowed() || useTipStore.getState().tip) return
    const candidate = tipForAction(action, before, after)
    const tip = candidate ? engine.offer(candidate, seconds()) : null
    if (tip) show(tip)
  })
}
