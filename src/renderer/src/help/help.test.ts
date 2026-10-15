import { describe, expect, it } from 'vitest'
import { DECK_IDS } from '../audio/types'
import { helpFor } from './helpLookup'
import { DECK_CONTROLS, GLOBAL_CONTROLS, deckTourId, parseDeckTourId } from './tourIds'

describe('tour-ID-er', () => {
  it('lager og leser deck-ID-er', () => {
    expect(deckTourId('A', 'play')).toBe('deck-a-play')
    expect(parseDeckTourId('deck-b-volume')).toEqual({ deck: 'B', control: 'volume' })
    expect(parseDeckTourId('deck-c-play')).toBeNull()
    expect(parseDeckTourId('crossfader')).toBeNull()
  })
})

describe('hjelpetekster', () => {
  it('finnes for alle kontroller', () => {
    const ids = [...GLOBAL_CONTROLS, ...DECK_IDS.flatMap((d) => DECK_CONTROLS.map((c) => deckTourId(d, c)))]
    for (const id of ids) {
      const help = helpFor(id)
      expect(help, id).not.toBeNull()
      expect(help!.title.length, id).toBeGreaterThan(0)
      expect(help!.what.length, id).toBeGreaterThan(0)
    }
  })

  it('fyller inn deck og snarvei', () => {
    expect(helpFor('deck-b-panel')?.title).toBe('Deck B')
    expect(helpFor('deck-a-play')?.when).toContain('Snarvei: Q')
    expect(helpFor('deck-b-play')?.when).toContain('Snarvei: P')
    for (const id of ['deck-a-load', 'deck-b-meter']) {
      const help = helpFor(id)!
      expect(JSON.stringify(help)).not.toMatch(/\{(deck|key)\}/)
    }
  })

  it('gir null for ukjente ID-er', () => {
    expect(helpFor('finnes-ikke')).toBeNull()
  })
})
