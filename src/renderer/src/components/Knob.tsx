import { useRef } from 'react'

interface KnobProps {
  value: number
  min?: number
  max?: number
  /** Verdien dobbeltklikk setter knotten tilbake til. */
  defaultValue?: number
  label: string
  /** Fullt navn for skjermlesere. */
  ariaLabel: string
  tourId: string
  onChange: (value: number) => void
  /** Farge på buen: deck A eller B. */
  accent?: 'a' | 'b'
  /** Tekst for skjermlesere, f.eks. «-6 dB». */
  valueText?: string
}

/** Hvor mange piksler musa må flyttes for å gå fra min til maks. */
const DRAG_PIXELS = 180
const SWEEP = 270
const SIZE = 34

function polar(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const rad = ((degrees - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx, cy, r, from)
  const [x2, y2] = polar(cx, cy, r, to)
  const large = Math.abs(to - from) > 180 ? 1 : 0
  const sweep = to > from ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`
}

/**
 * Dreieknapp. Dra opp/ned, bruk musehjulet eller piltastene.
 * Hold Shift for finjustering. Dobbeltklikk for å nullstille.
 */
export function Knob({
  value,
  min = -1,
  max = 1,
  defaultValue = 0,
  label,
  ariaLabel,
  tourId,
  onChange,
  accent,
  valueText
}: KnobProps): React.JSX.Element {
  const drag = useRef<{ y: number; value: number } | null>(null)
  const clamp = (v: number): number => Math.min(max, Math.max(min, v))
  const range = max - min
  const toAngle = (v: number): number => -SWEEP / 2 + ((v - min) / range) * SWEEP
  const angle = toAngle(value)
  const start = toAngle(Math.min(Math.max(defaultValue, min), max))
  const c = SIZE / 2
  const changed = Math.abs(value - defaultValue) > 1e-6

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    drag.current = { y: event.clientY, value }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    const fine = event.shiftKey ? 0.25 : 1
    const delta = ((drag.current.y - event.clientY) / DRAG_PIXELS) * range * fine
    onChange(clamp(drag.current.value + delta))
  }
  const endDrag = (): void => {
    drag.current = null
  }
  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = (event.shiftKey ? 0.01 : 0.05) * range
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') onChange(clamp(value + step))
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') onChange(clamp(value - step))
    else if (event.key === 'Home') onChange(min)
    else if (event.key === 'End') onChange(max)
    else if (event.key === 'Enter' || event.key === 'Delete' || event.key === 'Backspace') onChange(defaultValue)
    else return
    event.preventDefault()
    // Ikke la piltastene også flytte kryssslideren.
    event.stopPropagation()
  }

  return (
    <div className="knob">
      <div
        className={`knob__dial ${accent ? `knob__dial--${accent}` : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 100) / 100}
        aria-valuetext={valueText}
        data-tour-id={tourId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => onChange(defaultValue)}
        onKeyDown={onKeyDown}
        onWheel={(e) => onChange(clamp(value - Math.sign(e.deltaY) * 0.03 * range))}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <path d={arc(c, c, c - 3, -SWEEP / 2, SWEEP / 2)} className="knob__track" />
          {changed && (
            <path d={arc(c, c, c - 3, Math.min(start, angle), Math.max(start, angle))} className="knob__value" />
          )}
          <circle cx={c} cy={c} r={c - 8} className="knob__body" />
          <line
            x1={c}
            y1={c}
            x2={polar(c, c, c - 10, angle)[0]}
            y2={polar(c, c, c - 10, angle)[1]}
            className="knob__pointer"
          />
        </svg>
      </div>
      <span className="knob__label">{label}</span>
    </div>
  )
}
