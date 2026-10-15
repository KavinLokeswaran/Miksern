import type { DeckId } from '../audio/types'
import type { SortKey } from '../library/filterSort'

/**
 * Alle handlinger i appen. Knapper, tastatur, (senere) MIDI, introen og tipsene
 * bruker de samme handlingene – via dispatch().
 */
export type Action =
  | { type: 'deck/openFile'; deck: DeckId }
  | { type: 'deck/loadTrack'; deck: DeckId; trackId: string }
  | { type: 'deck/togglePlay'; deck: DeckId }
  | { type: 'deck/play'; deck: DeckId }
  | { type: 'deck/pause'; deck: DeckId }
  | { type: 'deck/seek'; deck: DeckId; seconds: number }
  | { type: 'deck/setVolume'; deck: DeckId; value: number }
  | { type: 'mixer/setCrossfader'; value: number }
  | { type: 'mixer/setMasterVolume'; value: number }
  | { type: 'library/pickFolder' }
  | { type: 'library/rescan' }
  | { type: 'library/setSearch'; query: string }
  | { type: 'library/sortBy'; key: SortKey }
  // Hendelser som kommer fra lydmotoren, ikke fra brukeren:
  | { type: 'deck/loaded'; deck: DeckId; trackId: string | null }
  | { type: 'deck/ended'; deck: DeckId }

export type ActionType = Action['type']
