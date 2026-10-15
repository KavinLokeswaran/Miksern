import { useEffect, useRef, useState } from 'react'

/** Canvas som holder seg skarpt på Retina-skjermer og følger størrelsen på elementet. */
export function useCanvas(): {
  ref: React.RefObject<HTMLCanvasElement | null>
  size: { width: number; height: number; dpr: number }
} {
  const ref = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0, dpr: 1 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(canvas.clientWidth))
      const height = Math.max(1, Math.round(canvas.clientHeight))
      canvas.width = width * dpr
      canvas.height = height * dpr
      setSize({ width, height, dpr })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return { ref, size }
}
