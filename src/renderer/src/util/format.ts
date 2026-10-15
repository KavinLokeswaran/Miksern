/** Formaterer sekunder som m:ss, f.eks. 3:07. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const whole = Math.floor(seconds)
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Tid igjen, med minustegn, f.eks. -2:31. */
export function formatRemaining(position: number, duration: number): string {
  return `-${formatTime(Math.max(0, Math.ceil(duration - position)))}`
}
