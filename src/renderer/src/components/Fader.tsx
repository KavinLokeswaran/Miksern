import type { TourId } from '../help/tourIds'

interface FaderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  orientation: 'vertical' | 'horizontal'
  label: string
  tourId: TourId
  /** Verdien et dobbeltklikk setter faderen tilbake til. */
  resetValue?: number
  className?: string
}

/** Stor, tydelig skyvekontroll. Verdi 0–1 hvis ikke annet er oppgitt. */
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
  return (
    <input
      type="range"
      className={`fader fader--${orientation} ${className ?? ''}`}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      data-tour-id={tourId}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
      onDoubleClick={resetValue === undefined ? undefined : () => onChange(resetValue)}
    />
  )
}
