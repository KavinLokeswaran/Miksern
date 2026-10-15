import { useState } from 'react'
import { dispatch } from '../actions/dispatch'
import { DECK_IDS } from '../audio/types'
import { PRACTICE_BEATS } from '../practice/arrangement'

/** Knapp i biblioteket for å laste øvelses-beatene på en deck. */
export function PracticeMenu(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="practice">
      <button
        type="button"
        className="button button--small"
        data-tour-id="practice"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Øvelses-beats {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="practice__panel">
          {([1, 2] as const).map((beat) => (
            <div key={beat} className="practice__row">
              <span>
                {PRACTICE_BEATS[beat].title} <span className="practice__bpm">{PRACTICE_BEATS[beat].bpm} BPM</span>
              </span>
              {DECK_IDS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`tracks__load tracks__load--${d.toLowerCase()}`}
                  aria-label={`Last inn ${PRACTICE_BEATS[beat].title} på deck ${d}`}
                  onClick={() => {
                    setOpen(false)
                    void dispatch({ type: 'practice/load', deck: d, beat })
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
