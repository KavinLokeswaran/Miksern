import { useEffect, useRef } from 'react'
import { getEngine } from '../audio/AudioEngine'
import { CLIP_LEVEL, meterFraction } from '../audio/meterMath'
import type { MeterTarget } from '../audio/types'
import type { TourId } from '../help/tourIds'
import { onTick } from '../ui/ticker'

const CLIP_HOLD_MS = 1500
const PEAK_HOLD_MS = 900
const FALL_PER_FRAME = 0.02

interface Props {
  target: MeterTarget
  tourId: TourId
  label: string
}

/** Nivåmåler med topp-strek og rødt klippelys. */
export function LevelMeterView({ target, tourId, label }: Props): React.JSX.Element {
  const maskRef = useRef<HTMLDivElement>(null)
  const peakRef = useRef<HTMLDivElement>(null)
  const clipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const engine = getEngine()
    let shown = 0
    let peakHold = 0
    let peakTime = 0
    let clipTime = -Infinity
    return onTick((now) => {
      const level = engine.readLevel(target)
      const fraction = meterFraction(level.peak)
      // Måleren stiger med en gang, men faller rolig, så den er lett å lese.
      shown = fraction > shown ? fraction : Math.max(fraction, shown - FALL_PER_FRAME)
      if (fraction >= peakHold || now - peakTime > PEAK_HOLD_MS) {
        peakHold = fraction
        peakTime = now
      }
      if (level.peak >= CLIP_LEVEL) clipTime = now
      if (maskRef.current) maskRef.current.style.transform = `scaleY(${1 - shown})`
      if (peakRef.current) peakRef.current.style.bottom = `${peakHold * 100}%`
      clipRef.current?.classList.toggle('meter__clip--on', now - clipTime < CLIP_HOLD_MS)
    })
  }, [target])

  return (
    <div className="meter" data-tour-id={tourId} role="meter" aria-label={label}>
      <div ref={clipRef} className="meter__clip" aria-hidden />
      <div className="meter__bar">
        <div ref={maskRef} className="meter__mask" />
        <div ref={peakRef} className="meter__peak" />
      </div>
    </div>
  )
}
