import { dispatch } from '../actions/dispatch'
import { TEMPO_RANGE } from '../audio/sync'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { useAppStore } from '../state/store'
import { formatPitch } from '../util/format'
import { Fader } from './Fader'

/** Tempo-slider (pitch): ±8 %. Opp = raskere. */
export function TempoControl({ id }: { id: DeckId }): React.JSX.Element {
  const pitch = useAppStore((s) => s.decks[id].pitch)
  const disabled = useAppStore((s) => s.decks[id].status !== 'ready')
  return (
    <div className={`tempo ${disabled ? 'tempo--disabled' : ''}`}>
      <span className="tempo__end">+8 %</span>
      <Fader
        orientation="vertical"
        min={-TEMPO_RANGE}
        max={TEMPO_RANGE}
        step={0.0005}
        value={pitch}
        resetValue={0}
        label={`Tempo deck ${id}`}
        tourId={deckTourId(id, 'tempo')}
        className={`fader--${id.toLowerCase()} fader--tempo`}
        onChange={(value) => void dispatch({ type: 'deck/setPitch', deck: id, value })}
      />
      <span className="tempo__end">−8 %</span>
      <span className="tempo__value">{formatPitch(pitch)}</span>
    </div>
  )
}
