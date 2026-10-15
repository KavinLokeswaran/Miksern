import { describe, expect, it } from 'vitest'
import { CONTROL_GROUPS, groupsUnlockedBy, isGroupVisible, LESSON_IDS } from './controlGroups'

const simple = { advancedMode: false, completedLessons: [], activeLesson: null }

describe('synlighet for kontrollgrupper', () => {
  it('skjuler alt ekstra i Enkel modus', () => {
    for (const g of CONTROL_GROUPS) expect(isGroupVisible(g, simple)).toBe(false)
  })

  it('viser alt i Avansert modus', () => {
    for (const g of CONTROL_GROUPS) expect(isGroupVisible(g, { ...simple, advancedMode: true })).toBe(true)
  })

  it('låser opp når leksjonen er fullført', () => {
    const input = { ...simple, completedLessons: ['eq-filter'] }
    expect(isGroupVisible('eq', input)).toBe(true)
    expect(isGroupVisible('filter', input)).toBe(true)
    expect(isGroupVisible('loops', input)).toBe(false)
  })

  it('viser kontrollene mens leksjonen pågår', () => {
    expect(isGroupVisible('fx', { ...simple, activeLesson: 'fx' })).toBe(true)
  })

  it('hver leksjon låser opp minst én gruppe', () => {
    for (const lesson of LESSON_IDS) expect(groupsUnlockedBy(lesson).length).toBeGreaterThan(0)
  })
})
