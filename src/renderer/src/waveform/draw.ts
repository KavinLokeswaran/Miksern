import type { BeatGrid } from '@shared/analysis'
import type { DeckWaveform } from '../analysis/deckWaveforms'

/** Tegner bølgeformer på et canvas. Høyden på strekene viser lydstyrken. */

export interface WaveColors {
  /** Deckens farge. */
  accent: string
  /** Farge for diskant (lyse lyder). */
  high: string
}

/** Høyeste verdi for hvert bånd mellom to tidspunkt. */
function peakBetween(wf: DeckWaveform, fromBin: number, toBin: number): [number, number, number] {
  let l = 0
  let m = 0
  let h = 0
  const start = Math.max(0, fromBin)
  const end = Math.min(wf.bins, Math.max(toBin, fromBin + 1))
  for (let b = start; b < end; b++) {
    const i = b * 3
    if (wf.data[i] > l) l = wf.data[i]
    if (wf.data[i + 1] > m) m = wf.data[i + 1]
    if (wf.data[i + 2] > h) h = wf.data[i + 2]
  }
  return [l, m, h]
}

/**
 * Tegner bølgeformen fra `startTime` med `secondsPerPixel` sekunder per piksel (i låtens tid).
 * Tre lag: hele lyden (dempet), mellomtone + diskant (sterkere) og diskant (lys).
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wf: DeckWaveform,
  startTime: number,
  secondsPerPixel: number,
  colors: WaveColors
): void {
  const mid = height / 2
  const scale = (height / 2) * 0.95
  const layers = [new Path2D(), new Path2D(), new Path2D()]
  for (let x = 0; x < width; x++) {
    const t0 = startTime + x * secondsPerPixel
    const t1 = t0 + secondsPerPixel
    if (t1 < 0) continue
    const fromBin = Math.floor(t0 * wf.binsPerSecond)
    if (fromBin >= wf.bins) break
    const [l, m, h] = peakBetween(wf, fromBin, Math.ceil(t1 * wf.binsPerSecond))
    const all = Math.max(l, m, h) / 255
    const upper = Math.max(m, h) / 255
    const top = h / 255
    if (all > 0) layers[0].rect(x, mid - all * scale, 1, Math.max(1, 2 * all * scale))
    if (upper > 0) layers[1].rect(x, mid - upper * scale * 0.8, 1, 2 * upper * scale * 0.8)
    if (top > 0) layers[2].rect(x, mid - top * scale * 0.6, 1, 2 * top * scale * 0.6)
  }
  ctx.globalAlpha = 0.45
  ctx.fillStyle = colors.accent
  ctx.fill(layers[0])
  ctx.globalAlpha = 0.95
  ctx.fill(layers[1])
  ctx.globalAlpha = 0.8
  ctx.fillStyle = colors.high
  ctx.fill(layers[2])
  ctx.globalAlpha = 1
}

/** Tynne loddrette streker for hvert slag. */
export function drawBeatLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: BeatGrid,
  startTime: number,
  secondsPerPixel: number,
  color: string
): void {
  const beat = 60 / grid.bpm
  const endTime = startTime + width * secondsPerPixel
  const first = Math.ceil((startTime - grid.firstBeat) / beat)
  ctx.fillStyle = color
  for (let k = first; ; k++) {
    const t = grid.firstBeat + k * beat
    if (t > endTime) break
    if (t < 0) continue
    const x = Math.round((t - startTime) / secondsPerPixel)
    // Svak strek over hele høyden, og tydelige merker øverst og nederst.
    ctx.globalAlpha = 0.25
    ctx.fillRect(x, 0, 1, height)
    ctx.globalAlpha = 0.9
    ctx.fillRect(x - 1, 0, 3, 5)
    ctx.fillRect(x - 1, height - 5, 3, 5)
  }
  ctx.globalAlpha = 1
}

/** Leser en CSS-farge (f.eks. --deck-a). */
export function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#fff'
}
