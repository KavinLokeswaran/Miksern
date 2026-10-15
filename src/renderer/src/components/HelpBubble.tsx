import { useEffect, useRef, useState } from 'react'
import { helpFor } from '../help/helpLookup'
import type { HelpText } from '../help/helpTexts'

const SHOW_DELAY_MS = 700
const SELECTOR = '[data-help-id], [data-tour-id]:not([data-no-help])'

interface Bubble {
  help: HelpText
  rect: DOMRect
}

/**
 * Hjelpebobler: hold musa over en kontroll en liten stund, så vises en kort forklaring.
 * Teksten hentes fra help/helpTexts.ts ut fra kontrollens data-tour-id.
 */
export function HelpBubble(): React.JSX.Element | null {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const current = useRef<Element | null>(null)
  const timer = useRef<number | undefined>(undefined)
  /** Etter et klikk vises ikke boblen igjen før musa har vært borte fra kontrollen. */
  const suppressed = useRef<Element | null>(null)

  useEffect(() => {
    const hide = (): void => {
      window.clearTimeout(timer.current)
      setBubble(null)
    }

    const onOver = (event: PointerEvent): void => {
      const el = (event.target as Element | null)?.closest?.(SELECTOR) ?? null
      if (el === current.current) return
      current.current = el
      hide()
      if (!el || el === suppressed.current) return
      suppressed.current = null
      const id = (el as HTMLElement).dataset.helpId ?? (el as HTMLElement).dataset.tourId
      const help = id ? helpFor(id) : null
      if (!help) return
      timer.current = window.setTimeout(() => {
        if (current.current === el && el.isConnected) setBubble({ help, rect: el.getBoundingClientRect() })
      }, SHOW_DELAY_MS)
    }

    const onDown = (): void => {
      suppressed.current = current.current
      hide()
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('blur', hide)
    window.addEventListener('scroll', hide, true)
    return () => {
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('blur', hide)
      window.removeEventListener('scroll', hide, true)
      window.clearTimeout(timer.current)
    }
  }, [])

  if (!bubble) return null
  return <BubbleView bubble={bubble} />
}

function BubbleView({ bubble }: { bubble: Bubble }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { rect } = bubble
    const margin = 10
    const width = el.offsetWidth
    const height = el.offsetHeight
    let left = rect.left + rect.width / 2 - width / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    let top = rect.bottom + margin
    if (top + height > window.innerHeight - margin) top = rect.top - height - margin
    setPos({ left, top: Math.max(margin, top) })
  }, [bubble])

  return (
    <div
      ref={ref}
      className="help-bubble"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <div className="help-bubble__title">{bubble.help.title}</div>
      <div className="help-bubble__what">{bubble.help.what}</div>
      {bubble.help.when && <div className="help-bubble__when">{bubble.help.when}</div>}
    </div>
  )
}
