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

const bpmFormat = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** BPM med én desimal og norsk komma, f.eks. 124,0. */
export function formatBpm(bpm: number): string {
  return bpmFormat.format(bpm)
}

/** Tempoendring i prosent med fortegn, f.eks. +2,4 % eller −1,0 %. */
export function formatPitch(pitch: number): string {
  const percent = Math.round(pitch * 1000) / 10
  if (percent === 0) return '0,0 %'
  return `${percent > 0 ? '+' : '−'}${bpmFormat.format(Math.abs(percent))} %`
}
