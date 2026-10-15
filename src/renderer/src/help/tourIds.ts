import type { DeckId } from '../audio/types'

/**
 * Stabile ID-er for alle kontroller (data-tour-id). Introen, leksjonene og
 * hjelpeboblene peker på kontrollene med disse. Ikke endre en ID som er i bruk.
 */
export const DECK_CONTROLS = ['panel', 'load', 'play', 'track', 'time', 'bpm', 'position', 'volume', 'meter'] as const
export type DeckControl = (typeof DECK_CONTROLS)[number]

export const GLOBAL_CONTROLS = [
  'crossfader',
  'master-volume',
  'master-meter',
  'library',
  'library-folder',
  'library-rescan',
  'library-status',
  'library-search',
  'library-sort',
  'library-list',
  'library-load-a',
  'library-load-b',
  'library-skipped'
] as const
export type GlobalControl = (typeof GLOBAL_CONTROLS)[number]

export type DeckTourId = `deck-${Lowercase<DeckId>}-${DeckControl}`
export type TourId = DeckTourId | GlobalControl

export function deckTourId(deck: DeckId, control: DeckControl): DeckTourId {
  return `deck-${deck.toLowerCase() as Lowercase<DeckId>}-${control}`
}

/** Gjør om en ID til deck og kontroll, eller null hvis den ikke gjelder en deck. */
export function parseDeckTourId(id: string): { deck: DeckId; control: DeckControl } | null {
  const match = /^deck-([ab])-(.+)$/.exec(id)
  if (!match || !(DECK_CONTROLS as readonly string[]).includes(match[2])) return null
  return { deck: match[1].toUpperCase() as DeckId, control: match[2] as DeckControl }
}

/** Props som settes på en kontroll: <button {...tour('crossfader')}> */
export function tour(id: TourId): { 'data-tour-id': TourId } {
  return { 'data-tour-id': id }
}
