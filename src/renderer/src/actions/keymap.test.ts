import { describe, expect, it } from 'vitest'
import { SHORTCUTS, shortcutFor } from './keymap'

describe('tastatursnarveier', () => {
  it('har play for begge decks', () => {
    expect(shortcutFor('KeyQ')?.action).toEqual({ type: 'deck/togglePlay', deck: 'A' })
    expect(shortcutFor('KeyP')?.action).toEqual({ type: 'deck/togglePlay', deck: 'B' })
  })

  it('flytter krysslideren med pilene', () => {
    const left = shortcutFor('ArrowLeft')!.action
    expect(typeof left === 'function' && left({ crossfader: 0.5 })).toEqual({
      type: 'mixer/setCrossfader',
      value: 0.45
    })
  })

  it('Shift+W/O setter cue der låten er nå', () => {
    expect(shortcutFor('KeyW', true)?.action).toEqual({ type: 'deck/setCueHere', deck: 'A' })
    expect(shortcutFor('KeyO', true)?.action).toEqual({ type: 'deck/setCueHere', deck: 'B' })
    expect(shortcutFor('KeyW')?.action).toEqual({ type: 'deck/cue', deck: 'A' })
  })

  it('bruker vanlig snarvei med Shift når det ikke finnes en egen', () => {
    expect(shortcutFor('KeyQ', true)?.action).toEqual({ type: 'deck/togglePlay', deck: 'A' })
    expect(shortcutFor('KeyZ', true)).toBeNull()
  })

  it('har ingen doble taster', () => {
    const codes = SHORTCUTS.map((s) => `${s.shift ? 'shift+' : ''}${s.code}`)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
