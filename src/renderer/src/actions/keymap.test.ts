import { describe, expect, it } from 'vitest'
import { SHORTCUTS, shortcutFor } from './keymap'

describe('tastatursnarveier', () => {
  it('har play for begge decks', () => {
    expect(shortcutFor('KeyQ')?.action).toEqual({ type: 'deck/togglePlay', deck: 'A' })
    expect(shortcutFor('KeyP')?.action).toEqual({ type: 'deck/togglePlay', deck: 'B' })
  })

  it('flytter kryssslideren med pilene', () => {
    const left = shortcutFor('ArrowLeft')!.action
    expect(typeof left === 'function' && left({ crossfader: 0.5 })).toEqual({
      type: 'mixer/setCrossfader',
      value: 0.45
    })
  })

  it('har ingen doble taster', () => {
    const codes = SHORTCUTS.map((s) => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
