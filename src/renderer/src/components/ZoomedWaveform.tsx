import { useEffect } from 'react'
import { getDeckWaveform, onDeckWaveformChange } from '../analysis/deckWaveforms'
import { getEngine } from '../audio/AudioEngine'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { useAppStore } from '../state/store'
import { onTick } from '../ui/ticker'
import { cssColor, drawBeatLines, drawWaveform } from '../waveform/draw'
import { useCanvas } from '../waveform/useCanvas'

/** Hvor mange sekunder (ekte tid) som vises over hele bredden. */
const VISIBLE_SECONDS = 6

/**
 * Innzoomet, rullende bølgeform. Midten er «nå».
 * Bredden er i ekte tid, så to låter i samme tempo får like tette slagstreker.
 */
export function ZoomedWaveform({ id }: { id: DeckId }): React.JSX.Element {
  const { ref, size } = useCanvas()
  const status = useAppStore((s) => s.decks[id].status)
  const analysis = useAppStore((s) => s.decks[id].analysis)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || size.width <= 1) return
    const deck = getEngine().decks[id]
    const colors = { accent: cssColor(id === 'A' ? '--deck-a' : '--deck-b'), high: '#ffffff' }
    let last = ''
    let dirty = true
    const unsubscribe = onDeckWaveformChange((changed) => {
      if (changed === id) dirty = true
    })
    const stop = onTick(() => {
      const { pitch, grid } = useAppStore.getState().decks[id]
      const rate = 1 + pitch
      const position = deck.position
      const key = `${position}|${rate}|${grid?.bpm}|${grid?.firstBeat}`
      if (!dirty && key === last) return
      last = key
      dirty = false
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
      ctx.clearRect(0, 0, size.width, size.height)
      const wf = getDeckWaveform(id)
      if (!wf) return
      const secondsPerPixel = (VISIBLE_SECONDS * rate) / size.width
      const startTime = position - (size.width / 2) * secondsPerPixel
      drawWaveform(ctx, size.width, size.height, wf, startTime, secondsPerPixel, colors)
      if (grid) drawBeatLines(ctx, size.width, size.height, grid, startTime, secondsPerPixel, '#ffffff')
    })
    return () => {
      stop()
      unsubscribe()
    }
  }, [id, ref, size])

  const message =
    status === 'empty'
      ? `Deck ${id}: ingen låt`
      : status === 'loading' || analysis === 'running'
        ? 'Analyserer …'
        : null

  return (
    <div className={`zoomed zoomed--${id.toLowerCase()}`} data-tour-id={deckTourId(id, 'waveform')}>
      <span className="zoomed__tag">{id}</span>
      <canvas ref={ref} className="zoomed__canvas" />
      <div className="zoomed__now" aria-hidden />
      {message && <div className="zoomed__message">{message}</div>}
    </div>
  )
}
