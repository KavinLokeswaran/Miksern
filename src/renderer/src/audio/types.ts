export type DeckId = 'A' | 'B'
export const DECK_IDS: readonly DeckId[] = ['A', 'B']

/** Hvor nivåmålerne måler. */
export type MeterTarget = DeckId | 'master'
