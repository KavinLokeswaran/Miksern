import { describe, expect, it } from 'vitest'
import { createInitialState, type AppState } from '../state/store'
import { TipEngine } from './tipEngine'
import { tipForAction, TIP_RULES, type TipContext } from './tipRules'

function ctx(change: (app: AppState) => void = () => {}, extra: Partial<TipContext> = {}): TipContext {
  const app = createInitialState()
  change(app)
  return {
    app,
    phaseOffset: null,
    clipping: { A: false, B: false, master: false },
    visible: () => true,
    introDone: true,
    completedLessons: ['eq-filter'],
    remaining: { A: 200, B: 200 },
    uptime: 10,
    ...extra
  }
}

const bothPlaying = (bpmA: number, bpmB: number) => (app: AppState) => {
  app.decks.A = { ...app.decks.A, status: 'ready', isPlaying: true, bpm: bpmA }
  app.decks.B = { ...app.decks.B, status: 'ready', isPlaying: true, bpm: bpmB }
}

describe('tipsregler', () => {
  const rule = (id: string) => TIP_RULES.find((r) => r.id === id)!

  it('foreslår Synk når tempoene er ulike', () => {
    expect(rule('tempo-differs').check(ctx(bothPlaying(120, 123)))).toBe(
      'Deck B er 3,0 BPM raskere enn A – prøv Synk på B.'
    )
    expect(rule('tempo-differs').check(ctx(bothPlaying(120, 120)))).toBeNull()
  })

  it('sier ikke noe om tempo når decken allerede er synket', () => {
    expect(
      rule('tempo-differs').check(
        ctx((app) => {
          bothPlaying(120, 124)(app)
          app.decks.B.synced = true
        })
      )
    ).toBeNull()
  })

  it('peker på trim når den er låst opp, ellers på leksjonen', () => {
    const clip = { clipping: { A: true, B: false, master: false } }
    expect(rule('clipping').check(ctx(undefined, clip))).toContain('skru ned trim på deck A')
    expect(rule('clipping').check(ctx(undefined, { ...clip, visible: () => false }))).toContain('Trim og nivåer')
  })

  it('ber deg dra krysslideren når begge spiller fullt', () => {
    expect(rule('both-full').check(ctx(bothPlaying(120, 120)))).toContain('krysslideren')
    expect(
      rule('both-full').check(
        ctx((app) => {
          bothPlaying(120, 120)(app)
          app.mixer.crossfader = 1
        })
      )
    ).toBeNull()
  })

  it('minner om neste låt når den som spiller snart er ferdig', () => {
    const playingA = (app: AppState) => {
      app.decks.A = { ...app.decks.A, status: 'ready', isPlaying: true }
    }
    expect(rule('track-ending').check(ctx(playingA, { remaining: { A: 30, B: 0 } }))).toContain(
      'gjør klar neste låt på deck B'
    )
    expect(rule('track-ending').check(ctx(playingA, { remaining: { A: 90, B: 0 } }))).toBeNull()
  })

  it('gir tips når tempo-slideren slår av Synk', () => {
    const before = createInitialState()
    before.decks.A.synced = true
    const after = createInitialState()
    expect(tipForAction({ type: 'deck/setPitch', deck: 'A', value: 0.01 }, before, after)?.id).toBe('pitch-ends-sync')
    expect(tipForAction({ type: 'deck/setPitch', deck: 'A', value: 0.01 }, after, after)).toBeNull()
  })
})

describe('tipsmotor', () => {
  it('venter til betingelsen har holdt seg en stund', () => {
    const engine = new TipEngine(new Set())
    const c = ctx(bothPlaying(120, 123))
    expect(engine.update(c, 0)).toBeNull()
    expect(engine.update(c, 2)).toBeNull()
    expect(engine.update(c, 4.1)?.id).toBe('tempo-differs')
  })

  it('viser aldri samme tips to ganger', () => {
    const shown = new Set<string>()
    const engine = new TipEngine(shown, 0)
    const c = ctx(bothPlaying(120, 123))
    engine.update(c, 0)
    expect(engine.update(c, 5)?.id).toBe('tempo-differs')
    expect(engine.update(c, 100)?.id).not.toBe('tempo-differs')
    expect(shown.has('tempo-differs')).toBe(true)
  })

  it('holder god avstand mellom tipsene', () => {
    const engine = new TipEngine(new Set(), 60)
    expect(engine.offer({ id: 'a', text: 'A' }, 0)).not.toBeNull()
    expect(engine.offer({ id: 'b', text: 'B' }, 30)).toBeNull()
    expect(engine.offer({ id: 'b', text: 'B' }, 61)).not.toBeNull()
  })

  it('nullstiller ventetiden hvis betingelsen slutter å gjelde', () => {
    const engine = new TipEngine(new Set())
    engine.update(ctx(bothPlaying(120, 123)), 0)
    engine.update(ctx(bothPlaying(120, 120)), 3)
    expect(engine.update(ctx(bothPlaying(120, 123)), 5)).toBeNull()
  })

  it('vet når et tips ikke lenger gjelder', () => {
    const engine = new TipEngine(new Set())
    expect(engine.stillRelevant('tempo-differs', ctx(bothPlaying(120, 123)))).toBe(true)
    expect(engine.stillRelevant('tempo-differs', ctx(bothPlaying(120, 120)))).toBe(false)
  })
})
