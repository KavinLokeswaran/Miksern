import type { RecordingResult } from '@shared/ipc'
import { getEngine } from '../audio/AudioEngine'
import { MixRecorder } from '../recording/mixRecorder'
import { updateRecording } from '../state/store'

let recorder: MixRecorder | null = null

export function getRecorder(onLimit: () => void): MixRecorder {
  if (!recorder) {
    recorder = new MixRecorder(getEngine())
    recorder.onLimitReached = onLimit
  }
  return recorder
}

/** Oppdaterer tilstanden ut fra svaret fra lagringen. */
export function applyRecordingResult(result: RecordingResult): void {
  switch (result.status) {
    case 'saved':
      updateRecording({ status: 'idle', startedAt: null, savedPath: result.path, error: null, unsavedSeconds: 0 })
      break
    case 'unsaved':
      updateRecording({
        status: 'unsaved',
        startedAt: null,
        unsavedSeconds: result.seconds,
        error: result.error ?? null
      })
      break
    case 'error':
      updateRecording({ status: 'idle', startedAt: null, error: 'Noe gikk galt med opptaket.' })
      break
  }
}
