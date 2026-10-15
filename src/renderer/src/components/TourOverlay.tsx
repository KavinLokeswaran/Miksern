import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { dispatch } from '../actions/dispatch'
import { runStepActions, snapshot } from '../learn/learnController'
import { tourById } from '../learn/tours'
import { useLearnStore } from '../state/learnStore'
import { onTick } from '../ui/ticker'

const PAD = 6
const CARD_WIDTH = 360
const GAP = 16

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function findTargets(ids: readonly string[]): Box[] {
  const boxes: Box[] = []
  for (const id of ids) {
    const el = document.querySelector(`[data-tour-id="${id}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    boxes.push({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 })
  }
  return boxes
}

const sameBoxes = (a: Box[], b: Box[]): boolean =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      Math.abs(x.x - b[i].x) < 1 &&
      Math.abs(x.y - b[i].y) < 1 &&
      Math.abs(x.w - b[i].w) < 1 &&
      Math.abs(x.h - b[i].h) < 1
  )

/** Plasserer forklaringsboksen ved siden av kontrollene, der det er best plass. */
function placeCard(boxes: Box[], cardHeight: number): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampTop = (t: number): number => Math.max(12, Math.min(t, vh - cardHeight - 12))
  const clampLeft = (l: number): number => Math.max(12, Math.min(l, vw - CARD_WIDTH - 12))
  if (boxes.length === 0) return { left: (vw - CARD_WIDTH) / 2, top: clampTop((vh - cardHeight) / 2) }
  const x1 = Math.min(...boxes.map((b) => b.x))
  const y1 = Math.min(...boxes.map((b) => b.y))
  const x2 = Math.max(...boxes.map((b) => b.x + b.w))
  const y2 = Math.max(...boxes.map((b) => b.y + b.h))
  const midY = (y1 + y2) / 2
  if (vw - x2 >= CARD_WIDTH + GAP * 2) return { left: x2 + GAP, top: clampTop(midY - cardHeight / 2) }
  if (x1 >= CARD_WIDTH + GAP * 2) return { left: x1 - GAP - CARD_WIDTH, top: clampTop(midY - cardHeight / 2) }
  const midX = clampLeft((x1 + x2) / 2 - CARD_WIDTH / 2)
  if (vh - y2 >= cardHeight + GAP * 2) return { left: midX, top: y2 + GAP }
  if (y1 >= cardHeight + GAP * 2) return { left: midX, top: y1 - GAP - cardHeight }
  return { left: clampLeft(vw - CARD_WIDTH - 24), top: clampTop(vh - cardHeight - 24) }
}

/**
 * Overlay for grunnkurs og leksjoner: mørker ned skjermen, lyser opp kontrollene
 * steget handler om, og viser en kort forklaring. Appen kan brukes som vanlig
 * gjennom overlayet – det er en øvelse.
 */
export function TourOverlay(): React.JSX.Element | null {
  const active = useLearnStore((s) => s.active)
  const practiceChosen = useLearnStore((s) => s.practiceChosen)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const tour = active ? tourById(active.tourId) : null
  const step = tour && active ? tour.steps[active.step] : null
  const targets = step?.target ?? []
  const targetKey = targets.join('|')

  useEffect(() => {
    if (!step) return
    const ids = targetKey ? targetKey.split('|') : []
    let last: Box[] = []
    setBoxes([])
    return onTick(() => {
      const next = findTargets(ids)
      if (!sameBoxes(next, last)) {
        last = next
        setBoxes(next)
      }
    })
  }, [step, targetKey])

  useLayoutEffect(() => {
    if (!cardRef.current) return
    setCardPos(placeCard(boxes, cardRef.current.offsetHeight))
  }, [boxes, step, active?.success])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') void dispatch({ type: 'learn/exit' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  if (!active || !tour || !step) return null
  const total = tour.steps.length
  const isLast = active.step === total - 1
  const snap = snapshot()
  const buttons = (step.buttons ?? []).filter((b) => !b.showIf || b.showIf({ ...snap, practiceChosen }))

  return (
    <div className="tour" aria-live="polite">
      <svg className="tour__dim" width="100%" height="100%" aria-hidden>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {boxes.map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={12} fill="black" />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(5, 7, 10, 0.66)" mask="url(#tour-mask)" />
      </svg>
      {boxes.map((b, i) => (
        <div key={i} className="tour__ring" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
      ))}
      <div
        ref={cardRef}
        className={`tour__card ${active.success ? 'tour__card--success' : ''}`}
        role="dialog"
        aria-label={`${tour.title}: ${step.title}`}
        style={cardPos ?? { left: -9999, top: 0 }}
      >
        <div className="tour__meta">
          {tour.title} · Steg {active.step + 1} av {total}
        </div>
        <h3 className="tour__title">{step.title}</h3>
        <p className="tour__text">{step.text}</p>
        {buttons.length > 0 && !active.success && (
          <div className="tour__actions">
            {buttons.map((b) => (
              <button
                key={b.label}
                type="button"
                className="button button--small button--accent"
                disabled={busy}
                onClick={() => {
                  setBusy(true)
                  void runStepActions(b.actions).finally(() => setBusy(false))
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
        {active.success ? (
          <div className="tour__status tour__status--ok">Bra! ✓</div>
        ) : (
          step.done && step.waiting && <div className="tour__status">{step.waiting}</div>
        )}
        <div className="tour__nav">
          <button
            type="button"
            className="tour__link"
            onClick={() => void dispatch({ type: 'learn/back' })}
            disabled={active.step === 0}
          >
            ← Tilbake
          </button>
          <span className="tour__spacer" />
          <button type="button" className="tour__link" onClick={() => void dispatch({ type: 'learn/exit' })}>
            Avslutt
          </button>
          {step.done ? (
            <button
              type="button"
              className="button button--small"
              onClick={() => void dispatch({ type: 'learn/skip' })}
              disabled={active.success}
            >
              Hopp over steget
            </button>
          ) : (
            <button
              type="button"
              className="button button--small button--accent"
              onClick={() => void dispatch({ type: 'learn/next' })}
            >
              {isLast ? 'Ferdig' : 'Neste →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
