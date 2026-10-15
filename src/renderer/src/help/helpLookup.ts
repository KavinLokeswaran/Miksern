import { SHORTCUTS } from '../actions/keymap'
import type { DeckId } from '../audio/types'
import { DECK_HELP, GLOBAL_HELP, type HelpText } from './helpTexts'
import { parseDeckTourId, type GlobalControl } from './tourIds'

function playKey(deck: DeckId): string {
  const shortcut = SHORTCUTS.find(
    (s) => typeof s.action === 'object' && s.action.type === 'deck/togglePlay' && s.action.deck === deck
  )
  return shortcut?.label ?? ''
}

function cueKey(deck: DeckId): string {
  const shortcut = SHORTCUTS.find(
    (s) => typeof s.action === 'object' && s.action.type === 'deck/cue' && s.action.deck === deck
  )
  return shortcut?.label ?? ''
}

function fill(text: string, deck: DeckId): string {
  return text.replaceAll('{deck}', deck).replaceAll('{key}', playKey(deck)).replaceAll('{cueKey}', cueKey(deck))
}

/** Finner hjelpeteksten for en data-tour-id, eller null. */
export function helpFor(tourId: string): HelpText | null {
  const deckId = parseDeckTourId(tourId)
  if (deckId) {
    const help = DECK_HELP[deckId.control]
    return {
      title: fill(help.title, deckId.deck),
      what: fill(help.what, deckId.deck),
      when: help.when && fill(help.when, deckId.deck)
    }
  }
  return GLOBAL_HELP[tourId as GlobalControl] ?? null
}
