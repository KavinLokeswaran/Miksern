import { useEffect, useRef } from 'react'
import { dispatch } from '../actions/dispatch'
import { useGroupVisible } from '../learn/useGroupVisible'
import { useAppStore } from '../state/store'
import { onTick } from '../ui/ticker'
import { formatTime } from '../util/format'
import { lastPathPart } from '../util/path'

/** Opptaksknappen øverst, med tid mens den tar opp og beskjed når fila er lagret. */
export function RecordButton(): React.JSX.Element | null {
  const recording = useAppStore((s) => s.recording)
  const visible = useGroupVisible('recording')
  const timeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (recording.status !== 'recording' || recording.startedAt === null) return
    const started = recording.startedAt
    let last = ''
    return onTick((now) => {
      const text = formatTime((now - started) / 1000)
      if (text !== last && timeRef.current) timeRef.current.textContent = text
      last = text
    })
  }, [recording.status, recording.startedAt])

  // Et opptak som pågår eller venter på lagring, vises alltid.
  if (!visible && recording.status === 'idle') return null
  const busy = recording.status === 'starting' || recording.status === 'stopping'
  const isRecording = recording.status === 'recording'

  return (
    <div className="record">
      {recording.status === 'unsaved' ? (
        <div className="record__unsaved" role="alert">
          <span>Opptaket ({formatTime(recording.unsavedSeconds)}) er ikke lagret.</span>
          {recording.error && <span className="record__error">{recording.error}</span>}
          <button
            type="button"
            className="button button--small"
            onClick={() => void dispatch({ type: 'recording/save' })}
          >
            Lagre …
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => void dispatch({ type: 'recording/discard' })}
          >
            Forkast
          </button>
        </div>
      ) : (
        <>
          {recording.savedPath && !isRecording && (
            <span className="record__saved" title={recording.savedPath}>
              Lagret: {lastPathPart(recording.savedPath)}
            </span>
          )}
          {recording.error && <span className="record__error">{recording.error}</span>}
          <button
            type="button"
            className={`record__button ${isRecording ? 'record__button--on' : ''}`}
            data-tour-id="record"
            disabled={busy}
            aria-pressed={isRecording}
            onClick={() => void dispatch({ type: isRecording ? 'recording/stop' : 'recording/start' })}
          >
            <span className="record__dot" aria-hidden />
            {isRecording ? (
              <>
                Stopp opptak{' '}
                <span ref={timeRef} className="record__time">
                  0:00
                </span>
              </>
            ) : recording.status === 'stopping' ? (
              'Lagrer …'
            ) : (
              <>
                Ta opp <span className="record__en">(record)</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}
