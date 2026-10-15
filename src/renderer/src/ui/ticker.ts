/**
 * Én felles animasjonsløkke for alt som oppdateres mange ganger i sekundet
 * (nivåmålere, tid, posisjon). Slik slipper React å tegne alt på nytt hele tiden.
 */
type Tick = (now: number) => void

const ticks = new Set<Tick>()
let running = false

function loop(now: number): void {
  for (const tick of ticks) tick(now)
  if (ticks.size > 0) requestAnimationFrame(loop)
  else running = false
}

export function onTick(tick: Tick): () => void {
  ticks.add(tick)
  if (!running) {
    running = true
    requestAnimationFrame(loop)
  }
  return () => ticks.delete(tick)
}
