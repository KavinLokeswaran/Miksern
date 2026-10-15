import type { DeckId } from '../audio/types'

/**
 * Alle handlinger i appen. Knapper, tastatur, (senere) MIDI, introen og tipsene
 * bruker de samme handlingene – via dispatch().
 */
export type Action =
  | { type: 'deck/openFile'; deck: DeckId }
  | { type: 'deck/togglePlay'; deck: DeckId }
  | { type: 'deck/play'; deck: DeckId }
  | { type: 'deck/pause'; deck: DeckId }
  | { type: 'deck/seek'; deck: DeckId; seconds: number }
  | { type: 'deck/setVolume'; deck: DeckId; value: number }
  | { type: 'mixer/setCrossfader'; value: number }
  | { type: 'mixer/setMasterVolume'; value: number }
  // Hendelser som kommer fra lydmotoren, ikke fra brukeren:
  | { type: 'deck/loaded'; deck: DeckId }
  | { type: 'deck/ended'; deck: DeckId }

export type ActionType = Action['type']
