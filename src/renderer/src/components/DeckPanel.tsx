import { useEffect, useRef } from 'react'
import { dispatch } from '../actions/dispatch'
import { getEngine } from '../audio/AudioEngine'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { useAppStore } from '../state/store'
import { onTick } from '../ui/ticker'
import { formatRemaining, formatTime } from '../util/format'

export function DeckPanel({ id }: { id: DeckId }): React.JSX.Element {
  const deck = useAppStore((s) => s.decks[id])
  const t = (control: Parameters<typeof deckTourId>[1]): string => deckTourId(id, control)
  const ready = deck.status === 'ready'

  return (
    <section className={`deck deck--${id.toLowerCase()}`} data-tour-id={t('panel')} data-no-help aria-label={`Deck ${id}`}>
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
                {deck.status === 'loading' ? 'Laster inn …' : deck.artist ?? 'Ukjent artist'}
              </div>
            </>
          )}
        </div>
        <div className="deck__bpm" data-tour-id={t('bpm')}>
          <span className="deck__bpm-value">{deck.bpm ? deck.bpm.toFixed(1) : '—'}</span>
          <span className="deck__bpm-label">BPM</span>
        </div>
      </header>

      {deck.error && (
        <div className="deck__error" role="alert">
          {deck.error}
        </div>
      )}

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
          className="button deck__load"
          data-tour-id={t('load')}
          disabled={deck.status === 'loading'}
          onClick={() => void dispatch({ type: 'deck/openFile', deck: id })}
        >
          Åpne fil …
        </button>
      </div>
    </section>
  )
}

/** Tid igjen og posisjonslinje. Oppdateres direkte fra lydmotoren. */
function DeckClock({ id, enabled }: { id: DeckId; enabled: boolean }): React.JSX.Element {
  const remainingRef = useRef<HTMLSpanElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const deck = getEngine().decks[id]
    let lastText = ''
    return onTick(() => {
      const pos = deck.position
      const dur = deck.duration
      const text = dur > 0 ? formatRemaining(pos, dur) : '-0:00'
      if (text !== lastText && remainingRef.current && elapsedRef.current) {
        remainingRef.current.textContent = text
        elapsedRef.current.textContent = `${formatTime(pos)} / ${formatTime(dur)}`
        lastText = text
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${dur > 0 ? pos / dur : 0})`
    })
  }, [id])

  const seekFromPointer = (event: React.PointerEvent<HTMLDivElement>): void => {
    const bar = barRef.current
    const duration = getEngine().decks[id].duration
    if (!bar || !enabled || duration <= 0) return
    const rect = bar.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    void dispatch({ type: 'deck/seek', deck: id, seconds: fraction * duration })
  }

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
      <div
        ref={barRef}
        className={`deck__position ${enabled ? '' : 'deck__position--disabled'}`}
        data-tour-id={deckTourId(id, 'position')}
        onPointerDown={seekFromPointer}
        role="slider"
        aria-label={`Posisjon i låten på deck ${id}`}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div ref={fillRef} className="deck__position-fill" />
      </div>
    </div>
  )
}
