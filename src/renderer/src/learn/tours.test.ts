import { describe, expect, it } from 'vitest'
import type { Action } from '../actions/types'
import { DECK_CONTROLS, GLOBAL_CONTROLS, deckTourId, type TourId } from '../help/tourIds'
import { createInitialState, type AppState, type DeckState } from '../state/store'
import { LESSON_IDS } from './controlGroups'
import { TourRunner } from './tourRunner'
import { INTRO, LESSONS, tourById } from './tours'
import type { TourSnapshot } from './tourTypes'

const VALID_TARGETS = new Set<string>([
  ...GLOBAL_CONTROLS,
  ...(['A', 'B'] as const).flatMap((d) => DECK_CONTROLS.map((c) => deckTourId(d, c)))
])

/** Lager en tilstand for testene, med endringer for decks og mikser. */
function snap(
  changes: { A?: Partial<DeckState>; B?: Partial<DeckState>; mixer?: Partial<AppState['mixer']> } = {},
  extra: Partial<TourSnapshot> = {}
): TourSnapshot {
  const app = createInitialState()
  app.decks.A = { ...app.decks.A, ...changes.A }
  app.decks.B = { ...app.decks.B, ...changes.B }
  app.mixer = { ...app.mixer, ...changes.mixer }
  return {
    app,
    library: { folder: null, trackCount: 0 },
    practiceChosen: false,
    clipping: { A: false, B: false, master: false },
    ...extra
  }
}

const ready = { status: 'ready' as const }
const play = { status: 'ready' as const, isPlaying: true }

/** Går gjennom et kurs: «Neste» for steg uten sjekk, ellers sendes hendelsen for steget. */
function walk(runner: TourRunner, events: Record<string, { action?: Action; snap: TourSnapshot }[]>): string[] {
  const done: string[] = []
  for (;;) {
    const step = runner.step
    if (step.done) {
      const list = events[step.id]
      if (!list) throw new Error(`Mangler hendelse for steg ${step.id}`)
      const ok = list.some((e) => runner.check({ action: e.action ?? null, snap: e.snap }))
      if (!ok) throw new Error(`Steget ${step.id} ble ikke fullført`)
    }
    done.push(step.id)
    if (!runner.next()) return done
  }
}

describe('kursdata', () => {
  it('peker bare på kontroller som finnes', () => {
    for (const tour of [INTRO, ...Object.values(LESSONS)]) {
      for (const step of tour.steps) {
        for (const target of step.target ?? [])
          expect(VALID_TARGETS.has(target as TourId), `${tour.id}/${step.id}: ${target}`).toBe(true)
      }
    }
  })

  it('grunnkurset er kort (7–9 steg) og leksjonene 3–6 steg', () => {
    expect(INTRO.steps.length).toBeGreaterThanOrEqual(7)
    expect(INTRO.steps.length).toBeLessThanOrEqual(9)
    for (const lesson of Object.values(LESSONS)) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(3)
      expect(lesson.steps.length).toBeLessThanOrEqual(6)
    }
  })

  it('har en leksjon for hver leksjons-ID', () => {
    for (const id of LESSON_IDS) expect(tourById(id)?.id).toBe(id)
    expect(tourById('intro')).toBe(INTRO)
    expect(tourById('finnes-ikke')).toBeNull()
  })

  it('har unike steg-ID-er og tekst på alle steg', () => {
    for (const tour of [INTRO, ...Object.values(LESSONS)]) {
      const ids = tour.steps.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const step of tour.steps) expect(step.title && step.text).toBeTruthy()
    }
  })
})

describe('grunnkurset', () => {
  it('kan gjennomføres ved å gjøre hvert steg', () => {
    const steps = walk(new TourRunner(INTRO), {
      music: [{ snap: snap({}, { practiceChosen: true }) }],
      'load-a': [{ snap: snap({ A: ready }) }],
      'play-a': [{ snap: snap({ A: play }) }],
      volume: [{ snap: snap({ A: { ...play, volume: 0.1 } }) }, { snap: snap({ A: { ...play, volume: 0.9 } }) }],
      'start-b': [{ snap: snap({ A: play, B: play }) }],
      sync: [{ snap: snap({ A: play, B: { ...play, synced: true } }) }],
      crossfader: [{ snap: snap({ mixer: { crossfader: 1 } }) }]
    })
    expect(steps.at(-1)).toBe('done')
  })

  it('venter til handlingen faktisk er gjort', () => {
    const runner = new TourRunner(INTRO)
    runner.next() // velkommen → musikk
    expect(runner.check({ action: null, snap: snap() })).toBe(false)
    expect(runner.check({ action: null, snap: snap({}, { library: { folder: '/musikk', trackCount: 0 } }) })).toBe(
      false
    )
    expect(runner.check({ action: null, snap: snap({}, { library: { folder: '/musikk', trackCount: 12 } }) })).toBe(
      true
    )
  })

  it('volumsteget krever både ned og opp', () => {
    const runner = new TourRunner(INTRO)
    while (runner.step.id !== 'volume') runner.next()
    expect(runner.check({ action: null, snap: snap({ A: { volume: 0.9 } }) })).toBe(false)
    expect(runner.check({ action: null, snap: snap({ A: { volume: 0.1 } }) })).toBe(false)
    expect(runner.check({ action: null, snap: snap({ A: { volume: 0.8 } }) })).toBe(true)
  })

  it('etter Tilbake må brukeren gjøre noe nytt før steget fullføres av seg selv', () => {
    const runner = new TourRunner(INTRO)
    while (runner.step.id !== 'play-a') runner.next()
    runner.next()
    runner.back()
    expect(runner.step.id).toBe('play-a')
    const playingSnap = snap({ A: play })
    expect(runner.check({ action: null, snap: playingSnap })).toBe(false)
    expect(runner.check({ action: { type: 'deck/play', deck: 'A' }, snap: playingSnap })).toBe(true)
  })
})

describe('leksjonene', () => {
  it('EQ og filter', () => {
    walk(new TourRunner(LESSONS['eq-filter']), {
      setup: [{ snap: snap({ A: play, B: play }) }],
      'kill-b': [{ snap: snap({ B: { eq: { low: -1, mid: 0, high: 0 } } }) }],
      swap: [{ snap: snap({ A: { eq: { low: -1, mid: 0, high: 0 } }, B: { eq: { low: 0, mid: 0, high: 0 } } }) }],
      filter: [{ snap: snap({ A: { filter: 0.8 } }) }, { snap: snap({ A: { filter: 0 } }) }]
    })
  })

  it('Trim og nivåer', () => {
    walk(new TourRunner(LESSONS['trim-levels']), {
      setup: [{ snap: snap({ A: play }) }],
      clip: [{ snap: snap({ A: { trim: 1 } }, { clipping: { A: true, B: false, master: false } }) }],
      fix: [{ snap: snap({ A: { trim: 0 } }) }]
    })
  })

  it('Cue og hot cues: lagre er ikke nok, man må også hoppe', () => {
    const runner = new TourRunner(LESSONS.cues)
    walk(runner, {
      setup: [{ snap: snap({ A: play }) }],
      pause: [{ snap: snap({ A: ready }) }],
      'set-cue': [{ action: { type: 'deck/cue', deck: 'A' }, snap: snap({ A: ready }) }],
      'use-cue': [{ snap: snap({ A: play }) }, { action: { type: 'deck/cue', deck: 'A' }, snap: snap({ A: ready }) }],
      hotcue: [
        { snap: snap({ A: play }) },
        {
          action: { type: 'deck/hotCue', deck: 'A', index: 0 },
          snap: snap({ A: { ...play, hotCues: [10, null, null, null] } })
        },
        {
          action: { type: 'deck/hotCue', deck: 'A', index: 0 },
          snap: snap({ A: { ...play, hotCues: [10, null, null, null] } })
        }
      ]
    })
  })

  it('Loops', () => {
    const loop = (beats: number): Partial<DeckState> => ({ ...play, loop: { start: 1, end: 2, beats } })
    walk(new TourRunner(LESSONS.loops), {
      setup: [{ snap: snap({ A: play }) }],
      loop4: [{ snap: snap({ A: loop(4) }) }],
      shorter: [{ snap: snap({ A: loop(0.5) }) }],
      exit: [{ action: { type: 'deck/exitLoop', deck: 'A' }, snap: snap({ A: play }) }]
    })
  })

  it('Effekter', () => {
    const fx = (echo: boolean, amount: number, reverb = false): Partial<DeckState> => ({
      fx: { echo: { on: echo, amount }, reverb: { on: reverb, amount: 0.5 }, flanger: { on: false, amount: 0.5 } }
    })
    walk(new TourRunner(LESSONS.fx), {
      setup: [{ snap: snap({ A: play }) }],
      'echo-on': [{ snap: snap({ A: { ...play, ...fx(true, 0.5) } }) }],
      'echo-amount': [{ snap: snap({ A: { ...play, ...fx(true, 0.9) } }) }],
      'echo-out': [{ action: { type: 'deck/pause', deck: 'A' }, snap: snap({ A: { ...ready, ...fx(true, 0.9) } }) }],
      others: [{ snap: snap({ A: { ...play, ...fx(false, 0.9, true) } }) }]
    })
  })

  it('Opptak', () => {
    const rec = (status: AppState['recording']['status']): TourSnapshot => {
      const s = snap({ A: play })
      s.app.recording = { ...s.app.recording, status }
      return s
    }
    walk(new TourRunner(LESSONS.recording), {
      setup: [{ snap: snap({ A: play }) }],
      'start-rec': [{ snap: rec('recording') }],
      'stop-rec': [{ snap: rec('idle') }]
    })
  })
})
