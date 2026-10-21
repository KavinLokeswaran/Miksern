import { useEffect, useRef } from 'react'
import type { TourId } from '../help/tourIds'
import { glideStep, snapToDetent, wheelPixels } from './controlMath'

interface FaderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  orientation: 'vertical' | 'horizontal'
  label: string
  tourId: TourId
  /** Verdien et dobbeltklikk setter faderen tilbake til. Faderen «hakker» også litt der. */
  resetValue?: number
  className?: string
}

/** Hvor lenge faderen glir når du klikker et sted på sporet (millisekunder). */
const GLIDE_MS = 140
/** Shift gir finjustering: så mye saktere. */
const FINE = 0.2

/**
 * Stor, tydelig skyvekontroll. Verdi 0–1 hvis ikke annet er oppgitt.
 * - Ta tak i knotten: den følger musa uten å hoppe.
 * - Klikk på sporet: knotten glir dit.
 * - Musehjul/styreflate, piltaster og Shift for finjustering. Dobbeltklikk nullstiller.
 */
export function Fader({
  value,
  min = 0,
  max = 1,
  step = 0.001,
  onChange,
  orientation,
  label,
  tourId,
  resetValue,
  className
}: FaderProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  /** Siste verdi vi har sendt, så raske bevegelser ikke venter på at React tegner på nytt. */
  const current = useRef(value)
  const drag = useRef<{ pointer: number; raw: number } | null>(null)
  const glide = useRef<number | null>(null)
  const vertical = orientation === 'vertical'
  const range = max - min

  useEffect(() => {
    if (!drag.current && glide.current === null) current.current = value
  }, [value])
  useEffect(() => () => stopGlide(), [])

  const clamp = (v: number): number => Math.min(max, Math.max(min, v))
  const quantize = (v: number): number => clamp(min + Math.round((v - min) / step) * step)
  const emit = (v: number): void => {
    const next = quantize(v)
    if (next === current.current) return
    current.current = next
    onChange(next)
  }

  function stopGlide(): void {
    if (glide.current !== null) cancelAnimationFrame(glide.current)
    glide.current = null
  }

  const glideTo = (target: number, then?: () => void): void => {
    stopGlide()
    const from = current.current
    const started = performance.now()
    const frame = (now: number): void => {
      const t = Math.min((now - started) / GLIDE_MS, 1)
      emit(glideStep(from, target, t))
      if (t < 1) glide.current = requestAnimationFrame(frame)
      else {
        glide.current = null
        then?.()
      }
    }
    glide.current = requestAnimationFrame(frame)
  }

  /** Lengden knotten kan bevege seg (piksler). */
  const travel = (): number => {
    const root = rootRef.current
    const thumb = thumbRef.current
    if (!root || !thumb) return 1
    return Math.max(1, vertical ? root.clientHeight - thumb.offsetHeight : root.clientWidth - thumb.offsetWidth)
  }

  /** Verdien som tilsvarer et punkt på sporet. */
  const valueAt = (x: number, y: number): number => {
    const root = rootRef.current!
    const thumb = thumbRef.current!
    const rect = root.getBoundingClientRect()
    const fraction = vertical
      ? 1 - (y - rect.top - thumb.offsetHeight / 2) / travel()
      : (x - rect.left - thumb.offsetWidth / 2) / travel()
    return clamp(min + fraction * range)
  }

  const pointerPos = (e: React.PointerEvent): number => (vertical ? -e.clientY : e.clientX)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    stopGlide()
    const onThumb = thumbRef.current?.contains(event.target as Node)
    if (onThumb) {
      drag.current = { pointer: pointerPos(event), raw: current.current }
      return
    }
    // Klikk på sporet: gli dit, og fortsett å dra derfra.
    const target = valueAt(event.clientX, event.clientY)
    drag.current = { pointer: pointerPos(event), raw: target }
    glideTo(target)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const d = drag.current
    if (!d) return
    const pos = pointerPos(event)
    const delta = ((pos - d.pointer) / travel()) * range * (event.shiftKey ? FINE : 1)
    d.pointer = pos
    d.raw = clamp(d.raw + delta)
    if (delta === 0) return
    stopGlide()
    emit(event.shiftKey ? d.raw : snapToDetent(d.raw, resetValue, range))
  }

  const endDrag = (): void => {
    drag.current = null
  }

  const onWheel = (event: React.WheelEvent): void => {
    const horizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    // Opp/høyre øker verdien.
    const px = wheelPixels(horizontalScroll ? event.deltaX : -event.deltaY, event.deltaMode)
    if (px === 0) return
    stopGlide()
    emit(current.current + (px / (travel() * 2)) * range * (event.shiftKey ? FINE : 1))
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    const small = range * (event.shiftKey ? 0.002 : 0.01)
    const v = current.current
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') emit(v + small)
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') emit(v - small)
    else if (event.key === 'PageUp') emit(v + range * 0.1)
    else if (event.key === 'PageDown') emit(v - range * 0.1)
    else if (event.key === 'Home') glideTo(min)
    else if (event.key === 'End') glideTo(max)
    else return
    event.preventDefault()
    // Ikke la piltastene også flytte krysslideren.
    event.stopPropagation()
  }

  const fraction = range > 0 ? (clamp(value) - min) / range : 0
  const mark = resetValue === undefined ? null : (resetValue - min) / range
  return (
    <div
      ref={rootRef}
      className={`fader fader--${orientation} ${className ?? ''}`}
      style={{ '--pos': fraction, '--mark': mark ?? 0 } as React.CSSProperties}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 1000) / 1000}
      data-tour-id={tourId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onDoubleClick={resetValue === undefined ? undefined : () => glideTo(resetValue)}
    >
      <div className="fader__track" aria-hidden>
        <div className="fader__fill" />
      </div>
      {mark !== null && <div className="fader__mark" aria-hidden />}
      <div ref={thumbRef} className="fader__thumb" aria-hidden />
    </div>
  )
}
