import { useEffect, useRef, useState } from 'react'
import { effectiveBpm } from '../audio/sync'
import { dispatch } from '../actions/dispatch'
import { getEngine } from '../audio/AudioEngine'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { droppedTrackId, isTrackDrag } from '../library/dragTrack'
import { useAppStore } from '../state/store'
import { onTick } from '../ui/ticker'
import { formatBpm, formatRemaining, formatTime } from '../util/format'
import { OverviewWaveform } from './OverviewWaveform'
import { TempoControl } from './TempoControl'

export function DeckPanel({ id }: { id: DeckId }): React.JSX.Element {
  const deck = useAppStore((s) => s.decks[id])
  const t = (control: Parameters<typeof deckTourId>[1]): string => deckTourId(id, control)
  const ready = deck.status === 'ready'
  const [dropping, setDropping] = useState(false)

  const onDragOver = (event: React.DragEvent): void => {
    if (!isTrackDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDropping(true)
  }
  const onDrop = (event: React.DragEvent): void => {
    setDropping(false)
    const trackId = droppedTrackId(event)
    if (!trackId) return
    event.preventDefault()
    void dispatch({ type: 'deck/loadTrack', deck: id, trackId })
  }

  return (
    <section
      className={`deck deck--${id.toLowerCase()} ${dropping ? 'deck--dropping' : ''}`}
      data-tour-id={t('panel')}
      data-no-help
      aria-label={`Deck ${id}`}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false)
      }}
      onDrop={onDrop}
    >
      {dropping && <div className="deck__drop-hint">Slipp for å laste inn på deck {id}</div>}
      <header className="deck__header">
        <div className="deck__badge" data-help-id={t('panel')}>
          {id}
        </div>
        <div className="deck__track" data-tour-id={t('track')}>
          {deck.status === 'empty' && <div className="deck__title deck__title--empty">Ingen låt lastet inn</div>}
          {deck.status !== 'empty' && (
            <>
              <div className="deck__title">{deck.title}</div>
              <div className="deck__artist">
                {deck.status === 'loading' ? 'Laster inn …' : (deck.artist ?? 'Ukjent artist')}
              </div>
            </>
          )}
        </div>
        <div className="deck__bpm" data-tour-id={t('bpm')}>
          <span className="deck__bpm-value">
            {deck.bpm ? formatBpm(effectiveBpm(deck.bpm, deck.pitch)) : deck.analysis === 'running' ? '…' : '—'}
          </span>
          <span className="deck__bpm-label">{deck.analysis === 'running' && !deck.bpm ? 'FINNER TEMPO' : 'BPM'}</span>
        </div>
      </header>

      {deck.error && (
        <div className="deck__error" role="alert">
          {deck.error}
        </div>
      )}
      {deck.notice && !deck.error && (
        <div className="deck__notice" role="status">
          {deck.notice}
        </div>
      )}

      <div className="deck__body">
        <div className="deck__main">
          <DeckClock id={id} enabled={ready} />

          <div className="deck__controls">
            <button
              type="button"
              className={`deck__play ${deck.isPlaying ? 'deck__play--on' : ''}`}
              data-tour-id={t('play')}
              disabled={!ready}
              aria-pressed={deck.isPlaying}
              onClick={() => void dispatch({ type: 'deck/togglePlay', deck: id })}
            >
              <span className="deck__play-icon" aria-hidden>
                {deck.isPlaying ? '❚❚' : '▶'}
              </span>
              <span>{deck.isPlaying ? 'Pause' : 'Spill av'}</span>
            </button>
            <button
              type="button"
              className={`deck__sync ${deck.synced ? 'deck__sync--on' : ''}`}
              data-tour-id={t('sync')}
              disabled={!ready}
              aria-pressed={deck.synced}
              onClick={() => void dispatch({ type: 'deck/toggleSync', deck: id })}
            >
              Synk <span className="deck__sync-en">(sync)</span>
            </button>
            <button
              type="button"
              className="button deck__load"
              data-tour-id={t('load')}
              disabled={deck.status === 'loading'}
              onClick={() => void dispatch({ type: 'deck/openFile', deck: id })}
            >
              Åpne fil …
            </button>
          </div>
        </div>
        <TempoControl id={id} />
      </div>
    </section>
  )
}

/** Tid igjen og oversikt over låten. Oppdateres direkte fra lydmotoren. */
function DeckClock({ id, enabled }: { id: DeckId; enabled: boolean }): React.JSX.Element {
  const remainingRef = useRef<HTMLSpanElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const deck = getEngine().decks[id]
    let lastText = ''
    return onTick(() => {
      const pos = deck.position
      const dur = deck.duration
      const text = `${dur > 0 ? formatRemaining(pos, dur) : '-0:00'}|${formatTime(pos)}`
      if (text !== lastText && remainingRef.current && elapsedRef.current) {
        remainingRef.current.textContent = dur > 0 ? formatRemaining(pos, dur) : '-0:00'
        elapsedRef.current.textContent = `${formatTime(pos)} / ${formatTime(dur)}`
        lastText = text
      }
    })
  }, [id])

  return (
    <div className="deck__clock">
      <div className="deck__time" data-tour-id={deckTourId(id, 'time')}>
        <span ref={remainingRef} className="deck__remaining">
          -0:00
        </span>
        <span ref={elapsedRef} className="deck__elapsed">
          0:00 / 0:00
        </span>
      </div>
      <OverviewWaveform id={id} enabled={enabled} />
    </div>
  )
}
