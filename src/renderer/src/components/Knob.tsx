import { useRef } from 'react'
import { glideStep, snapToDetent, wheelPixels } from './controlMath'

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
const DRAG_PIXELS = 200
/** Musehjul/styreflate: piksler for å gå fra min til maks. */
const WHEEL_PIXELS = 400
/** Hvor lenge knotten bruker på å gli tilbake ved dobbeltklikk (millisekunder). */
const GLIDE_MS = 160
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
 * Dreieknapp. Dra opp/ned (eller til siden), bruk musehjulet/styreflaten eller piltastene.
 * Hold Shift for finjustering. Knotten hakker litt i midtstillingen. Dobbeltklikk for å nullstille.
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
  const drag = useRef<{ x: number; y: number; raw: number } | null>(null)
  /** Siste verdi vi har sendt, så raske bevegelser ikke venter på at React tegner på nytt. */
  const current = useRef(value)
  const glide = useRef<number | null>(null)
  if (!drag.current && glide.current === null) current.current = value
  const clamp = (v: number): number => Math.min(max, Math.max(min, v))
  const range = max - min
  const toAngle = (v: number): number => -SWEEP / 2 + ((v - min) / range) * SWEEP
  const angle = toAngle(value)
  const start = toAngle(Math.min(Math.max(defaultValue, min), max))
  const c = SIZE / 2
  const changed = Math.abs(value - defaultValue) > 1e-6

  const emit = (v: number): void => {
    const next = clamp(v)
    if (next === current.current) return
    current.current = next
    onChange(next)
  }
  const stopGlide = (): void => {
    if (glide.current !== null) cancelAnimationFrame(glide.current)
    glide.current = null
  }
  const glideTo = (target: number): void => {
    stopGlide()
    const from = current.current
    const started = performance.now()
    const frame = (now: number): void => {
      const t = Math.min((now - started) / GLIDE_MS, 1)
      emit(glideStep(from, target, t))
      glide.current = t < 1 ? requestAnimationFrame(frame) : null
    }
    glide.current = requestAnimationFrame(frame)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    stopGlide()
    drag.current = { x: event.clientX, y: event.clientY, raw: current.current }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const d = drag.current
    if (!d) return
    const fine = event.shiftKey ? 0.25 : 1
    // Opp og til høyre skrur opp. Hver bevegelse legges til, så Shift kan slås av og på underveis.
    const px = d.y - event.clientY + (event.clientX - d.x)
    d.x = event.clientX
    d.y = event.clientY
    d.raw = clamp(d.raw + (px / DRAG_PIXELS) * range * fine)
    emit(event.shiftKey ? d.raw : snapToDetent(d.raw, defaultValue, range))
  }
  const onWheel = (event: React.WheelEvent): void => {
    const horizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    const px = wheelPixels(horizontalScroll ? event.deltaX : -event.deltaY, event.deltaMode)
    if (px === 0) return
    stopGlide()
    emit(current.current + (px / WHEEL_PIXELS) * range * (event.shiftKey ? 0.25 : 1))
  }
  const endDrag = (): void => {
    drag.current = null
  }
  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = (event.shiftKey ? 0.01 : 0.05) * range
    const v = current.current
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') emit(v + step)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') emit(v - step)
    else if (event.key === 'Home') glideTo(min)
    else if (event.key === 'End') glideTo(max)
    else if (event.key === 'Enter' || event.key === 'Delete' || event.key === 'Backspace') glideTo(defaultValue)
    else return
    event.preventDefault()
    // Ikke la piltastene også flytte krysslideren.
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
        onDoubleClick={() => glideTo(defaultValue)}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
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
