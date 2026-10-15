/**
 * Oppskriften på øvelses-beatene: tempo, toneart og hvilke deler som spiller når.
 * Ren data og logikk, så den kan testes uten lyd.
 */

export interface PracticeBeatSpec {
  id: 1 | 2
  title: string
  bpm: number
  /** Grunntoner for akkordene (Hz), én per takt i en runde på fire takter. */
  roots: number[]
  /** Øvelses-beat 2 har ride-cymbal i stedet for åpen hi-hat, så de låter forskjellig. */
  hat: 'open' | 'ride'
}

const A1 = 55
const F1 = 43.65
const C2 = 65.41
const G1 = 49
const D2 = 73.42
const Bb1 = 58.27

export const PRACTICE_BEATS: Record<1 | 2, PracticeBeatSpec> = {
  1: { id: 1, title: 'Øvelses-beat 1', bpm: 120, roots: [A1, F1, C2, G1], hat: 'open' },
  2: { id: 2, title: 'Øvelses-beat 2', bpm: 124, roots: [D2, Bb1, F1 * 2, C2], hat: 'ride' }
}

export type Section = 'intro' | 'main' | 'breakdown' | 'outro'

/** Antall takter (á fire slag) i hver del. Til sammen 88 takter ≈ 3 minutter. */
export const SECTIONS: { section: Section; bars: number }[] = [
  { section: 'intro', bars: 8 },
  { section: 'main', bars: 32 },
  { section: 'breakdown', bars: 8 },
  { section: 'main', bars: 32 },
  { section: 'outro', bars: 8 }
]

export const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0)

/** Hvilken del en takt (fra 0) hører til. */
export function sectionOfBar(bar: number): Section {
  let start = 0
  for (const s of SECTIONS) {
    if (bar < start + s.bars) return s.section
    start += s.bars
  }
  return 'outro'
}

export interface BarParts {
  kick: boolean
  hats: boolean
  clap: boolean
  bass: boolean
  pad: boolean
}

/** Hvilke instrumenter som spiller i en del. Intro og outro er bare trommer – lett å mikse inn og ut. */
export function partsFor(section: Section): BarParts {
  switch (section) {
    case 'intro':
    case 'outro':
      return { kick: true, hats: true, clap: false, bass: false, pad: false }
    case 'main':
      return { kick: true, hats: true, clap: true, bass: true, pad: false }
    case 'breakdown':
      return { kick: false, hats: false, clap: false, bass: false, pad: true }
  }
}

export function durationSeconds(spec: PracticeBeatSpec): number {
  // Litt ekstra på slutten, så siste slag får klinge ut.
  return (TOTAL_BARS * 4 * 60) / spec.bpm + 1
}
