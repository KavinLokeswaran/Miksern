import { dispatch } from '../actions/dispatch'
import { useLearnStore } from '../state/learnStore'

/** Liten beskjed nederst, f.eks. «Ny kontroll låst opp!». Klikk bort. */
export function Toast(): React.JSX.Element | null {
  const toast = useLearnStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="toast" role="status" key={toast.id}>
      <div>
        <div className="toast__title">{toast.title}</div>
        <div className="toast__text">{toast.text}</div>
      </div>
      <button
        type="button"
        className="toast__close"
        aria-label="Lukk"
        onClick={() => void dispatch({ type: 'learn/dismissToast' })}
      >
        ×
      </button>
    </div>
  )
}
