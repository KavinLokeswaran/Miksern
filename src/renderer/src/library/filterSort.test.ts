import { describe, expect, it } from 'vitest'
import type { TrackInfo } from '@shared/library'
import { matchesSearch, nextSort, normalize, visibleTracks } from './filterSort'

function track(partial: Partial<TrackInfo>): TrackInfo {
  return {
    id: partial.title ?? 'x',
    path: '/x',
    fileName: 'fil',
    ext: 'mp3',
    title: 'Uten navn',
    artist: null,
    album: null,
    duration: null,
    tagBpm: null,
    size: 1,
    mtimeMs: 1,
    status: 'ok',
    ...partial
  }
}

const tracks = [
  track({ title: 'Blå', artist: 'Ørjan', duration: 200, tagBpm: 124 }),
  track({ title: 'Allegro', artist: 'Café Del Mar', duration: 300, tagBpm: 120 }),
  track({ title: 'Zulu', artist: null, duration: 100 }),
  track({ title: 'Låst', artist: 'Apple', status: 'protected' })
]

describe('søk', () => {
  it('ignorerer store bokstaver og aksenter, men skiller å fra a', () => {
    expect(normalize('Café ÅÉ')).toBe('cafe åe')
    expect(matchesSearch(tracks[1], 'cafe')).toBe(true)
    expect(matchesSearch(tracks[0], 'BLÅ')).toBe(true)
    expect(matchesSearch(tracks[0], 'bla')).toBe(false)
  })

  it('krever at alle ordene finnes', () => {
    expect(matchesSearch(tracks[1], 'allegro del')).toBe(true)
    expect(matchesSearch(tracks[1], 'allegro ørjan')).toBe(false)
    expect(matchesSearch(tracks[1], '   ')).toBe(true)
  })
})

describe('sortering', () => {
  it('skjuler låter som ikke kan spilles', () => {
    expect(visibleTracks(tracks, '', { key: 'title', direction: 'asc' }).map((t) => t.title)).toEqual(['Allegro', 'Blå', 'Zulu'])
  })

  it('sorterer etter BPM og lengde, med ukjent til slutt', () => {
    expect(visibleTracks(tracks, '', { key: 'bpm', direction: 'asc' }).map((t) => t.title)).toEqual(['Allegro', 'Blå', 'Zulu'])
    expect(visibleTracks(tracks, '', { key: 'duration', direction: 'desc' }).map((t) => t.title)).toEqual(['Allegro', 'Blå', 'Zulu'])
  })

  it('bruker analysert BPM foran BPM fra taggene', () => {
    const analysis = { [tracks[2].id]: { grid: { bpm: 90, firstBeat: 0 } } }
    expect(visibleTracks(tracks, '', { key: 'bpm', direction: 'asc' }, analysis).map((t) => t.title)).toEqual(['Zulu', 'Allegro', 'Blå'])
  })

  it('sorterer artister alfabetisk på norsk, uten artist sist', () => {
    expect(visibleTracks(tracks, '', { key: 'artist', direction: 'asc' }).map((t) => t.artist)).toEqual(['Café Del Mar', 'Ørjan', null])
  })

  it('bytter retning ved nytt klikk på samme kolonne', () => {
    expect(nextSort({ key: 'title', direction: 'asc' }, 'title')).toEqual({ key: 'title', direction: 'desc' })
    expect(nextSort({ key: 'title', direction: 'desc' }, 'bpm')).toEqual({ key: 'bpm', direction: 'asc' })
  })
})
