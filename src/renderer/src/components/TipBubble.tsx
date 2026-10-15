import { dispatch } from '../actions/dispatch'
import { useTipStore } from '../tips/tipController'

/** Lite, diskret tips nederst til venstre. Kan klikkes bort. */
export function TipBubble(): React.JSX.Element | null {
  const tip = useTipStore((s) => s.tip)
  if (!tip) return null
  return (
    <div className="tip" role="status" key={tip.id}>
      <span className="tip__icon" aria-hidden>
        💡
      </span>
      <div className="tip__body">
        <div className="tip__label">Tips</div>
        <div className="tip__text">{tip.text}</div>
        <button
          type="button"
          className="tip__off"
          onClick={() => void dispatch({ type: 'settings/setTips', value: false })}
        >
          Slå av tips
        </button>
      </div>
      <button
        type="button"
        className="tip__close"
        aria-label="Lukk tipset"
        onClick={() => void dispatch({ type: 'tips/dismiss' })}
      >
        ×
      </button>
    </div>
  )
}
