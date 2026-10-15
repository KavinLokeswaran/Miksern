import type { AnalysisSummary, TrackInfo } from '@shared/library'

export type SortKey = 'title' | 'artist' | 'duration' | 'bpm'
export interface SortOrder {
  key: SortKey
  direction: 'asc' | 'desc'
}

/** Gjør tekst klar for søk: små bokstaver, uten aksenter (é → e), men æ/ø/å beholdes. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('nb')
    .replace(/å/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'å')
}

/** Søk: alle ordene må finnes i tittel, artist, album eller filnavn. */
export function matchesSearch(track: TrackInfo, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalize([track.title, track.artist, track.album, track.fileName].filter(Boolean).join(' '))
  return words.every((w) => haystack.includes(w))
}

const collator = new Intl.Collator('nb', { numeric: true, sensitivity: 'base' })

/** BPM fra appens egen analyse, ellers fra filens tagger. */
export function trackBpm(track: TrackInfo, analysis?: AnalysisSummary): number | null {
  return analysis?.grid?.bpm ?? track.tagBpm
}

function compareNullable(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

export function compareTracks(
  a: TrackInfo,
  b: TrackInfo,
  key: SortKey,
  analysis: Record<string, AnalysisSummary> = {}
): number {
  switch (key) {
    case 'title':
      return collator.compare(a.title, b.title)
    case 'artist': {
      // Låter uten artist havner nederst.
      if (!a.artist !== !b.artist) return a.artist ? -1 : 1
      return collator.compare(a.artist ?? '', b.artist ?? '') || collator.compare(a.title, b.title)
    }
    case 'duration':
      return compareNullable(a.duration, b.duration)
    case 'bpm':
      return compareNullable(trackBpm(a, analysis[a.id]), trackBpm(b, analysis[b.id]))
  }
}

/** Låter som kan spilles, filtrert og sortert. */
export function visibleTracks(
  tracks: TrackInfo[],
  query: string,
  order: SortOrder,
  analysis: Record<string, AnalysisSummary> = {}
): TrackInfo[] {
  const sign = order.direction === 'asc' ? 1 : -1
  return tracks
    .filter((t) => t.status === 'ok' && matchesSearch(t, query))
    .sort((a, b) => sign * compareTracks(a, b, order.key, analysis) || collator.compare(a.title, b.title))
}

/** Klikk på samme kolonne bytter retning. Ny kolonne starter stigende. */
export function nextSort(current: SortOrder, key: SortKey): SortOrder {
  if (current.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  return { key, direction: 'asc' }
}
