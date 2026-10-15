import { useEffect, useRef } from 'react'
import { limitingRecently, startClipMonitor } from '../ui/clipMonitor'
import { onTick } from '../ui/ticker'

/** Lyser når limiteren demper lyden. */
export function LimiterLamp(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    startClipMonitor()
    return onTick(() => ref.current?.classList.toggle('limiter--on', limitingRecently(300)))
  }, [])
  return (
    <div ref={ref} className="limiter" data-tour-id="limiter">
      <span className="limiter__lamp" aria-hidden />
      Limiter
    </div>
  )
}
