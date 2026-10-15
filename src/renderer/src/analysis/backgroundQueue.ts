import { findTrack, markTrackUnplayable, setTrackAnalysis, useLibraryStore } from '../state/libraryStore'
import { analyseFileInBackground } from './analysisService'

/**
 * Analyserer alle låtene i biblioteket én etter én i bakgrunnen.
 * Resultatet lagres, så hver låt bare analyseres én gang.
 */
let running = false
/** Låter som feilet denne økten, så vi ikke prøver dem om og om igjen. */
const failed = new Set<string>()
/** Kort pause mellom låtene, så resten av appen alltid får nok tid. */
const PAUSE_MS = 40

function updateProgress(): void {
  const { tracks, analysis } = useLibraryStore.getState()
  const playable = tracks.filter((t) => t.status === 'ok' && !failed.has(t.id))
  const done = playable.filter((t) => analysis[t.id]).length
  useLibraryStore.setState({ analysisProgress: done < playable.length ? { done, total: playable.length } : null })
}

function nextTrack(): string | null {
  const { tracks, analysis } = useLibraryStore.getState()
  return tracks.find((t) => t.status === 'ok' && !analysis[t.id] && !failed.has(t.id))?.id ?? null
}

export function startBackgroundAnalysis(): void {
  if (running) return
  running = true
  void (async () => {
    try {
      for (let id = nextTrack(); id; id = nextTrack()) {
        updateProgress()
        const track = findTrack(id)
        if (!track) continue
        try {
          const stored = await analyseFileInBackground(track.path)
          setTrackAnalysis(id, { grid: stored.analysis.grid })
        } catch (err) {
          failed.add(id)
          // Kunne ikke pakkes ut: fila kan ikke spilles, så den skal ikke vises i listen.
          if (err instanceof DOMException || (err instanceof Error && err.name === 'EncodingError')) markTrackUnplayable(id)
        }
        await new Promise((r) => setTimeout(r, PAUSE_MS))
      }
    } finally {
      running = false
      updateProgress()
    }
  })()
}
