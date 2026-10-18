import type { Action } from './types'

export interface Shortcut {
  /** KeyboardEvent.code – den fysiske tasten, så det virker likt på alle tastaturoppsett. */
  code: string
  /** Må Shift holdes nede? */
  shift?: boolean
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
  { code: 'KeyW', shift: true, label: 'Shift+W', action: { type: 'deck/setCueHere', deck: 'A' } },
  { code: 'KeyO', shift: true, label: 'Shift+O', action: { type: 'deck/setCueHere', deck: 'B' } },
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

/**
 * Finner snarveien for en tast, eller null. Med Shift brukes Shift-snarveien hvis
 * den finnes, ellers den vanlige (så f.eks. Shift+Q fortsatt starter deck A).
 */
export function shortcutFor(code: string, shift = false): Shortcut | null {
  const exact = SHORTCUTS.find((s) => s.code === code && !!s.shift === shift)
  if (exact || !shift) return exact ?? null
  return SHORTCUTS.find((s) => s.code === code && !s.shift) ?? null
}

/** Ikke kapre tastene når brukeren skriver i et felt eller styrer en slider. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false
  const el = target as HTMLElement
  if (el.isContentEditable) return true
  return el.closest('input, textarea, select') !== null
}
