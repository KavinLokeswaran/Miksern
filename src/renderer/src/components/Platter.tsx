import { useEffect, useRef, useState } from 'react'
import { dispatch } from '../actions/dispatch'
import { getEngine } from '../audio/AudioEngine'
import { platterAngle, turnDelta } from '../audio/jogMath'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { useAppStore } from '../state/store'
import { wheelPixels } from './controlMath'
import { onTick } from '../ui/ticker'

/** Ytterkanten (andel av radien) er skyv-ringen. Innenfor er selve platen (scratch). */
const RING_FROM = 0.84
/** Nær midten blir vinkelen ustø, så små bevegelser der telles ikke. */
const DEAD_CENTER = 0.12
/** Så mange sekunder før slutten begynner ringen å blinke. */
const ENDING_SECONDS = 30
/** Musehjul/styreflate: turer per piksel. */
const WHEEL_TURNS_PER_PIXEL = 0.0012

const VIEW = 200
const C = VIEW / 2
const PROGRESS_R = 96
const PROGRESS_LENGTH = 2 * Math.PI * PROGRESS_R
const GROOVES = [80, 74, 68, 62, 56, 50, 44]

/**
 * Platen (jog wheel). Den snurrer når låten spiller.
 * - Dra oppå platen: scratch – låten følger hånda, også baklengs.
 * - Dra i kanten: skyv tempoet litt opp eller ned, for å legge slagene oppå hverandre.
 * - Musehjul eller to fingre på styreflaten: skyv (eller flytt litt, hvis låten står stille).
 */
export function Platter({ id }: { id: DeckId }): React.JSX.Element {
  const ready = useAppStore((s) => s.decks[id].status === 'ready')
  const playing = useAppStore((s) => s.decks[id].isPlaying)
  const discRef = useRef<SVGGElement>(null)
  const progressRef = useRef<SVGCircleElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ angle: number } | null>(null)
  const [touch, setTouch] = useState<'scratch' | 'nudge' | null>(null)

  useEffect(() => {
    const deck = getEngine().decks[id]
    let lastAngle = -1
    let lastProgress = -1
    let lastEnding = false
    return onTick(() => {
      const angle = Math.round(platterAngle(deck.position) * 10) / 10
      if (angle !== lastAngle && discRef.current) {
        discRef.current.setAttribute('transform', `rotate(${angle} ${C} ${C})`)
        lastAngle = angle
      }
      const dur = deck.duration
      const progress = dur > 0 ? deck.position / dur : 0
      if (Math.abs(progress - lastProgress) > 0.0005 && progressRef.current) {
        progressRef.current.style.strokeDashoffset = String(PROGRESS_LENGTH * (1 - progress))
        lastProgress = progress
      }
      const ending = dur > 0 && deck.isPlaying && dur - deck.position < ENDING_SECONDS
      if (ending !== lastEnding && rootRef.current) {
        rootRef.current.classList.toggle('platter--ending', ending)
        lastEnding = ending
      }
    })
  }, [id])

  /** Vinkel og avstand fra midten (0–1 av radien) for et punkt på skjermen. */
  const locate = (el: Element, x: number, y: number): { angle: number; radius: number } => {
    const rect = el.getBoundingClientRect()
    const dx = x - (rect.left + rect.width / 2)
    const dy = y - (rect.top + rect.height / 2)
    return { angle: Math.atan2(dy, dx), radius: Math.hypot(dx, dy) / (rect.width / 2) }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || !ready) return
    const { angle, radius } = locate(event.currentTarget, event.clientX, event.clientY)
    if (radius > 1.02) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const mode = radius >= RING_FROM && playing ? 'nudge' : 'scratch'
    drag.current = { angle }
    setTouch(mode)
    void dispatch({ type: 'deck/jogStart', deck: id, mode })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    const { angle, radius } = locate(event.currentTarget, event.clientX, event.clientY)
    if (radius < DEAD_CENTER) return
    const turns = turnDelta(drag.current.angle, angle)
    drag.current.angle = angle
    if (turns !== 0) void dispatch({ type: 'deck/jogMove', deck: id, turns })
  }

  const endDrag = (): void => {
    if (!drag.current) return
    drag.current = null
    setTouch(null)
    void dispatch({ type: 'deck/jogEnd', deck: id })
  }

  const onWheel = (event: React.WheelEvent): void => {
    if (!ready || drag.current) return
    // Ned/høyre = fremover, som å dra platen med klokka.
    const delta = wheelPixels(
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY,
      event.deltaMode
    )
    if (delta !== 0) void dispatch({ type: 'deck/jogMove', deck: id, turns: delta * WHEEL_TURNS_PER_PIXEL })
  }

  return (
    <div
      ref={rootRef}
      className={`platter ${playing ? 'platter--playing' : ''} ${touch ? `platter--${touch}` : ''} ${ready ? '' : 'platter--disabled'}`}
      data-tour-id={deckTourId(id, 'platter')}
      role="group"
      aria-label={`Plate deck ${id}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onWheel={onWheel}
    >
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden>
        <circle cx={C} cy={C} r={99} className="platter__base" />
        <circle cx={C} cy={C} r={PROGRESS_R} className="platter__progress-track" />
        <circle
          ref={progressRef}
          cx={C}
          cy={C}
          r={PROGRESS_R}
          className="platter__progress"
          strokeDasharray={PROGRESS_LENGTH}
          strokeDashoffset={PROGRESS_LENGTH}
          transform={`rotate(-90 ${C} ${C})`}
        />
        <circle cx={C} cy={C} r={90} className="platter__ring" />
        <g ref={discRef}>
          {Array.from({ length: 48 }, (_, i) => (
            <line
              key={i}
              x1={C}
              y1={C - 90}
              x2={C}
              y2={C - (i % 4 === 0 ? 85 : 87.5)}
              className="platter__tick"
              transform={`rotate(${i * 7.5} ${C} ${C})`}
            />
          ))}
          <circle cx={C} cy={C} r={84} className="platter__vinyl" />
          {GROOVES.map((r) => (
            <circle key={r} cx={C} cy={C} r={r} className="platter__groove" />
          ))}
          <path d={`M ${C} ${C - 84} A 84 84 0 0 1 ${C + 59.4} ${C - 59.4}`} className="platter__shine" />
          <circle cx={C} cy={C} r={34} className="platter__label" />
          <line x1={C} y1={C - 36} x2={C} y2={C - 82} className="platter__marker" />
          <text x={C} y={C + 9} className="platter__letter">
            {id}
          </text>
          <circle cx={C} cy={C} r={3.5} className="platter__spindle" />
        </g>
      </svg>
    </div>
  )
}
