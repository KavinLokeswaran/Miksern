import type { Action } from './types'

export interface Shortcut {
  /** KeyboardEvent.code – den fysiske tasten, så det virker likt på alle tastaturoppsett. */
  code: string
  /** Hva som vises til brukeren. */
  label: string
  action: Action | ((state: { crossfader: number }) => Action)
}

/** Tastatursnarveier. Alle går gjennom dispatch(), akkurat som knappene. */
export const SHORTCUTS: Shortcut[] = [
  { code: 'KeyQ', label: 'Q', action: { type: 'deck/togglePlay', deck: 'A' } },
  { code: 'KeyP', label: 'P', action: { type: 'deck/togglePlay', deck: 'B' } },
  { code: 'KeyW', label: 'W', action: { type: 'deck/cue', deck: 'A' } },
  { code: 'KeyO', label: 'O', action: { type: 'deck/cue', deck: 'B' } },
  {
    code: 'ArrowLeft',
    label: '←',
    action: (s) => ({ type: 'mixer/setCrossfader', value: s.crossfader - 0.05 })
  },
  {
    code: 'ArrowRight',
    label: '→',
    action: (s) => ({ type: 'mixer/setCrossfader', value: s.crossfader + 0.05 })
  }
]

/** Finner snarveien for en tast, eller null. */
export function shortcutFor(code: string): Shortcut | null {
  return SHORTCUTS.find((s) => s.code === code) ?? null
}

/** Ikke kapre tastene når brukeren skriver i et felt eller styrer en slider. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false
  const el = target as HTMLElement
  if (el.isContentEditable) return true
  return el.closest('input, textarea, select') !== null
}
