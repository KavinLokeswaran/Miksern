import type { LoopRegion } from '../audio/loopMath'

/** Farger for hot cue 1–4. */
export const HOT_CUE_COLORS = ['#3ddc84', '#b07cff', '#34d1e0', '#ff5fa2']
export const CUE_COLOR = '#ffd23d'
const LOOP_FILL = 'rgba(61, 220, 132, 0.16)'
const LOOP_EDGE = 'rgba(61, 220, 132, 0.9)'

export interface Markers {
  cue: number | null
  hotCues: (number | null)[]
  loop: LoopRegion | null
}

/** Tegner loop, cue-punkt og hot cues oppå bølgeformen. */
export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startTime: number,
  secondsPerPixel: number,
  markers: Markers,
  showLabels: boolean
): void {
  const x = (t: number): number => Math.round((t - startTime) / secondsPerPixel)
  if (markers.loop) {
    const x1 = x(markers.loop.start)
    const x2 = x(markers.loop.end)
    if (x2 >= 0 && x1 <= width) {
      ctx.fillStyle = LOOP_FILL
      ctx.fillRect(x1, 0, x2 - x1, height)
      ctx.fillStyle = LOOP_EDGE
      ctx.fillRect(x1, 0, 2, height)
      ctx.fillRect(x2 - 2, 0, 2, height)
    }
  }
  markers.hotCues.forEach((t, i) => {
    if (t === null) return
    const px = x(t)
    if (px < -12 || px > width + 12) return
    ctx.fillStyle = HOT_CUE_COLORS[i]
    ctx.fillRect(px, 0, 2, height)
    if (showLabels) {
      ctx.fillRect(px, 0, 13, 13)
      ctx.fillStyle = '#0b0d11'
      ctx.font = 'bold 10px system-ui, sans-serif'
      ctx.fillText(String(i + 1), px + 3, 10)
    }
  })
  if (markers.cue !== null) {
    const px = x(markers.cue)
    if (px >= -8 && px <= width + 8) {
      ctx.fillStyle = CUE_COLOR
      ctx.beginPath()
      ctx.moveTo(px - 6, height)
      ctx.lineTo(px + 6, height)
      ctx.lineTo(px, height - 8)
      ctx.closePath()
      ctx.fill()
    }
  }
}
