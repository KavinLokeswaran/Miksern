import { dispatch } from '../actions/dispatch'
import { useSettingsStore } from '../state/settingsStore'

/** Bryter mellom Enkel modus og Avansert modus. */
export function ModeSwitch(): React.JSX.Element {
  const advanced = useSettingsStore((s) => s.advancedMode)
  return (
    <label className="mode" data-tour-id="mode-switch">
      <span className="mode__label">{advanced ? 'Avansert modus' : 'Enkel modus'}</span>
      <input
        type="checkbox"
        role="switch"
        className="mode__input"
        checked={advanced}
        aria-label="Avansert modus"
        onChange={(e) => void dispatch({ type: 'settings/setAdvanced', value: e.currentTarget.checked })}
      />
      <span className="mode__track" aria-hidden>
        <span className="mode__thumb" />
      </span>
    </label>
  )
}
