import type { TourId } from '../help/tourIds'

interface FaderProps {
  value: number
  onChange: (value: number) => void
  orientation: 'vertical' | 'horizontal'
  label: string
  tourId: TourId
  /** Verdien et dobbeltklikk setter faderen tilbake til. */
  resetValue?: number
  className?: string
}

/** Stor, tydelig skyvekontroll. Verdi 0–1. */
export function Fader({ value, onChange, orientation, label, tourId, resetValue, className }: FaderProps): React.JSX.Element {
  return (
    <input
      type="range"
      className={`fader fader--${orientation} ${className ?? ''}`}
      min={0}
      max={1}
      step={0.001}
      value={value}
      aria-label={label}
      data-tour-id={tourId}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
      onDoubleClick={resetValue === undefined ? undefined : () => onChange(resetValue)}
    />
  )
}
