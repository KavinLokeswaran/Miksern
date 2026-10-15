import { useEffect, useRef } from 'react'
import { dispatch } from '../actions/dispatch'
import { getDeckWaveform, onDeckWaveformChange } from '../analysis/deckWaveforms'
import { getEngine } from '../audio/AudioEngine'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { onTick } from '../ui/ticker'
import { useAppStore } from '../state/store'
import { cssColor, drawWaveform } from '../waveform/draw'
import { drawMarkers } from '../waveform/markers'
import { useCanvas } from '../waveform/useCanvas'

/** Hele låten i ett bilde. Klikk for å hoppe. Det som er spilt, blir mørkere. */
export function OverviewWaveform({ id, enabled }: { id: DeckId; enabled: boolean }): React.JSX.Element {
  const { ref, size } = useCanvas()
  const cache = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || size.width <= 1) return
    const deck = getEngine().decks[id]
    const colors = { accent: cssColor(id === 'A' ? '--deck-a' : '--deck-b'), high: '#ffffff' }

    /** Tegner hele bølgeformen én gang til et skjult canvas, så hver frame bare kopierer det. */
    const render = (): void => {
      const wf = getDeckWaveform(id)
      if (!wf) {
        cache.current = null
        return
      }
      const off = document.createElement('canvas')
      off.width = size.width * size.dpr
      off.height = size.height * size.dpr
      const octx = off.getContext('2d')
      if (!octx) return
      octx.scale(size.dpr, size.dpr)
      drawWaveform(octx, size.width, size.height, wf, 0, wf.bins / wf.binsPerSecond / size.width, colors)
      cache.current = off
    }
    render()

    let last = ''
    let dirty = true
    const unsubscribe = onDeckWaveformChange((changed) => {
      if (changed !== id) return
      render()
      dirty = true
    })
    const stop = onTick(() => {
      const duration = deck.duration
      const x = duration > 0 ? Math.round((deck.position / duration) * size.width) : 0
      const state = useAppStore.getState().decks[id]
      const key = `${x}|${state.cue}|${state.hotCues.join()}|${state.loop?.start}|${state.loop?.end}`
      if (!dirty && key === last) return
      last = key
      dirty = false
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
      ctx.clearRect(0, 0, size.width, size.height)
      if (cache.current) ctx.drawImage(cache.current, 0, 0, size.width, size.height)
      if (duration <= 0) return
      ctx.fillStyle = 'rgba(14, 16, 20, 0.55)'
      ctx.fillRect(0, 0, x, size.height)
      drawMarkers(ctx, size.width, size.height, 0, duration / size.width, state, false)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 1, 0, 2, size.height)
    })
    return () => {
      stop()
      unsubscribe()
    }
  }, [id, ref, size])

  const seek = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const duration = getEngine().decks[id].duration
    if (!enabled || duration <= 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    void dispatch({ type: 'deck/seek', deck: id, seconds: fraction * duration })
  }

  return (
    <canvas
      ref={ref}
      className={`overview ${enabled ? '' : 'overview--disabled'}`}
      data-tour-id={deckTourId(id, 'position')}
      onPointerDown={seek}
      role="slider"
      aria-label={`Posisjon i låten på deck ${id}`}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  )
}
