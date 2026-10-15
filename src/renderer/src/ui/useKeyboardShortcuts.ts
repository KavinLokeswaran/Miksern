import { useEffect } from 'react'
import { dispatch } from '../actions/dispatch'
import { isTypingTarget, shortcutFor } from '../actions/keymap'
import { useAppStore } from '../state/store'

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      const shortcut = shortcutFor(event.code)
      if (!shortcut) return
      // Play-knappene skal ikke slå av og på hvis tasten holdes nede.
      if (event.repeat && typeof shortcut.action === 'object') return
      event.preventDefault()
      const action =
        typeof shortcut.action === 'function'
          ? shortcut.action({ crossfader: useAppStore.getState().mixer.crossfader })
          : shortcut.action
      void dispatch(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
