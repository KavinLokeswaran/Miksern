import type { FxKind } from '../audio/fxMath'
import type { EqBand } from '../audio/toneMath'
import type { DeckId } from '../audio/types'
import type { SortKey } from '../library/filterSort'
import type { DeckPanelKind } from '../state/store'

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
  /** Trim, EQ og filter: -1 … 1, der 0 er midtstilling. */
  | { type: 'deck/setTrim'; deck: DeckId; value: number }
  | { type: 'deck/setEq'; deck: DeckId; band: EqBand; value: number }
  | { type: 'deck/setFilter'; deck: DeckId; value: number }
  /** Cue: spiller den, hopper den tilbake til cue-punktet. Står den stille, settes cue-punktet her. */
  | { type: 'deck/cue'; deck: DeckId }
  /** Hot cue 1–4 (index 0–3): tom = lagre her, ellers hopp dit. */
  | { type: 'deck/hotCue'; deck: DeckId; index: number }
  | { type: 'deck/deleteHotCue'; deck: DeckId; index: number }
  /** Loop med lengde i slag (0.5, 1, 2, 4, 8, 16). */
  | { type: 'deck/loop'; deck: DeckId; beats: number }
  | { type: 'deck/exitLoop'; deck: DeckId }
  | { type: 'deck/toggleFx'; deck: DeckId; fx: FxKind }
  | { type: 'deck/setFxAmount'; deck: DeckId; fx: FxKind; value: number }
  | { type: 'deck/showPanel'; deck: DeckId; panel: DeckPanelKind }
  /** Tempo-slideren: -0.08 til 0.08. */
  | { type: 'deck/setPitch'; deck: DeckId; value: number }
  | { type: 'deck/toggleSync'; deck: DeckId }
  | { type: 'mixer/setCrossfader'; value: number }
  | { type: 'mixer/setMasterVolume'; value: number }
  /** Laster øvelses-beat 1 (120 BPM) eller 2 (124 BPM). */
  | { type: 'practice/load'; deck: DeckId; beat: 1 | 2; play?: boolean }
  | { type: 'settings/setAdvanced'; value: boolean }
  /** Grunnkurs og leksjoner. `tour` er 'intro' eller en leksjons-ID. */
  | { type: 'learn/start'; tour: string }
  | { type: 'learn/next' }
  | { type: 'learn/back' }
  | { type: 'learn/skip' }
  | { type: 'learn/exit' }
  /** Brukeren valgte øvelses-beats i stedet for egen musikk. */
  | { type: 'learn/choosePractice' }
  | { type: 'learn/menu'; open: boolean }
  | { type: 'learn/dismissToast' }
  | { type: 'recording/start' }
  | { type: 'recording/stop' }
  /** Prøv å lagre et opptak som ikke ble lagret (åpner lagre-dialogen igjen). */
  | { type: 'recording/save' }
  | { type: 'recording/discard' }
  | { type: 'library/pickFolder' }
  | { type: 'library/rescan' }
  | { type: 'library/setSearch'; query: string }
  | { type: 'library/sortBy'; key: SortKey }
  // Hendelser som kommer fra lydmotoren, ikke fra brukeren:
  | { type: 'deck/loaded'; deck: DeckId; trackId: string | null }
  | { type: 'deck/ended'; deck: DeckId }
  | { type: 'deck/analysed'; deck: DeckId }

export type ActionType = Action['type']
