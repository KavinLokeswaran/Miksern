import { useEffect, useRef, useState } from 'react'
import type { AnalysisSummary, TrackInfo } from '@shared/library'
import { dispatch } from '../actions/dispatch'
import { DECK_IDS, type DeckId } from '../audio/types'
import { startTrackDrag } from '../library/dragTrack'
import { trackBpm, type SortKey, type SortOrder } from '../library/filterSort'
import { useLibraryStore } from '../state/libraryStore'
import { useAppStore } from '../state/store'
import { formatTime } from '../util/format'

const ROW_HEIGHT = 40
const OVERSCAN = 8

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'title', label: 'Tittel', className: 'col-title' },
  { key: 'artist', label: 'Artist', className: 'col-artist' },
  { key: 'duration', label: 'Lengde', className: 'col-duration' },
  { key: 'bpm', label: 'BPM', className: 'col-bpm' }
]

interface Props {
  tracks: TrackInfo[]
  sort: SortOrder
  emptyText: string
}

/** Låtliste som bare tegner radene som synes, så den er rask også med mange tusen låter. */
export function TrackList({ tracks, sort, emptyText }: Props): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(400)
  const loadedA = useAppStore((s) => s.decks.A.trackId)
  const loadedB = useAppStore((s) => s.decks.B.trackId)
  const analysis = useLibraryStore((s) => s.analysis)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.clientHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const last = Math.min(tracks.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN)

  return (
    <div className="tracks" data-tour-id="library-list" data-no-help>
      <div className="tracks__row tracks__head" role="row" data-tour-id="library-sort">
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            type="button"
            className={`tracks__sort ${col.className} ${sort.key === col.key ? 'tracks__sort--active' : ''}`}
            onClick={() => void dispatch({ type: 'library/sortBy', key: col.key })}
            aria-sort={sort.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            {col.label}
            {sort.key === col.key && <span aria-hidden>{sort.direction === 'asc' ? ' ▲' : ' ▼'}</span>}
          </button>
        ))}
        <span className="col-load">Last inn</span>
      </div>
      <div
        ref={scrollRef}
        className="tracks__scroll"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        role="rowgroup"
        aria-label="Låter"
      >
        {tracks.length === 0 ? (
          <div className="tracks__empty">{emptyText}</div>
        ) : (
          <div style={{ height: tracks.length * ROW_HEIGHT, position: 'relative' }}>
            {tracks.slice(first, last).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                analysis={analysis[track.id]}
                top={(first + i) * ROW_HEIGHT}
                loadedOn={DECK_IDS.filter((d) => (d === 'A' ? loadedA : loadedB) === track.id)}
                isFirst={first + i === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface RowProps {
  track: TrackInfo
  analysis: AnalysisSummary | undefined
  top: number
  loadedOn: DeckId[]
  /** Bare første rad får tour-ID-ene, så introen har ett sted å peke. */
  isFirst: boolean
}

function TrackRow({ track, analysis, top, loadedOn, isFirst }: RowProps): React.JSX.Element {
  const bpm = trackBpm(track, analysis)
  return (
    <div
      className="tracks__row tracks__item"
      role="row"
      style={{ top, height: ROW_HEIGHT }}
      draggable
      onDragStart={(e) => startTrackDrag(e, track.id)}
    >
      <span className="col-title">
        {loadedOn.map((d) => (
          <span key={d} className={`tracks__on tracks__on--${d.toLowerCase()}`} aria-label={`Ligger på deck ${d}`}>
            {d}
          </span>
        ))}
        {track.title}
      </span>
      <span className="col-artist">{track.artist ?? ''}</span>
      <span className="col-duration">{track.duration !== null ? formatTime(track.duration) : ''}</span>
      <span className="col-bpm">{bpm !== null ? bpm.toFixed(0) : ''}</span>
      <span className="col-load">
        {DECK_IDS.map((d) => (
          <button
            key={d}
            type="button"
            className={`tracks__load tracks__load--${d.toLowerCase()}`}
            aria-label={`Last inn «${track.title}» på deck ${d}`}
            data-help-id={`library-load-${d.toLowerCase()}`}
            data-tour-id={isFirst ? `library-load-${d.toLowerCase()}` : undefined}
            onClick={() => void dispatch({ type: 'deck/loadTrack', deck: d, trackId: track.id })}
          >
            {d}
          </button>
        ))}
      </span>
    </div>
  )
}
