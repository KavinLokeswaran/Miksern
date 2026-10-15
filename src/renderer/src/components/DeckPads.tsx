import { dispatch } from '../actions/dispatch'
import { FX_KINDS, type FxKind } from '../audio/fxMath'
import { LOOP_SIZES, loopLabel } from '../audio/loopMath'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import type { ControlGroup } from '../learn/controlGroups'
import { useGroupVisible } from '../learn/useGroupVisible'
import { useAppStore, type DeckPanelKind } from '../state/store'
import { formatTime } from '../util/format'
import { HOT_CUE_COLORS } from '../waveform/markers'
import { Knob } from './Knob'

const TABS: { panel: DeckPanelKind; label: string; group: ControlGroup }[] = [
  { panel: 'hotcues', label: 'Hot cues', group: 'hotcues' },
  { panel: 'loops', label: 'Loops', group: 'loops' },
  { panel: 'fx', label: 'Effekter', group: 'fx' }
]

const FX_NAMES: Record<FxKind, string> = { echo: 'Echo', reverb: 'Reverb', flanger: 'Flanger' }
const FX_TOUR = { echo: 'fx-echo', reverb: 'fx-reverb', flanger: 'fx-flanger' } as const

/** Fanene nederst på decken: hot cues, loops og effekter. */
export function DeckPads({ id }: { id: DeckId }): React.JSX.Element | null {
  const chosen = useAppStore((s) => s.decks[id].panel)
  const ready = useAppStore((s) => s.decks[id].status === 'ready')
  const visible: Record<DeckPanelKind, boolean> = {
    hotcues: useGroupVisible('hotcues'),
    loops: useGroupVisible('loops'),
    fx: useGroupVisible('fx')
  }
  const tabs = TABS.filter((t) => visible[t.panel])
  if (tabs.length === 0) return null
  // Er valgt fane skjult, vis den første synlige.
  const panel = visible[chosen] ? chosen : tabs[0].panel
  return (
    <div className="pads">
      <div className="pads__tabs" role="tablist" data-tour-id={deckTourId(id, 'tabs')}>
        {tabs.map((tab) => (
          <button
            key={tab.panel}
            type="button"
            role="tab"
            aria-selected={panel === tab.panel}
            className={`pads__tab ${panel === tab.panel ? 'pads__tab--on' : ''}`}
            onClick={() => void dispatch({ type: 'deck/showPanel', deck: id, panel: tab.panel })}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pads__panel" role="tabpanel">
        {panel === 'hotcues' && <HotCues id={id} ready={ready} />}
        {panel === 'loops' && <Loops id={id} ready={ready} />}
        {panel === 'fx' && <Effects id={id} />}
      </div>
    </div>
  )
}

function HotCues({ id, ready }: { id: DeckId; ready: boolean }): React.JSX.Element {
  const hotCues = useAppStore((s) => s.decks[id].hotCues)
  return (
    <div className="pads__row" data-tour-id={deckTourId(id, 'hotcues')}>
      {hotCues.map((time, index) => (
        <button
          key={index}
          type="button"
          disabled={!ready}
          className={`hotcue ${time === null ? 'hotcue--empty' : ''}`}
          style={time === null ? undefined : ({ '--pad': HOT_CUE_COLORS[index] } as React.CSSProperties)}
          aria-label={time === null ? `Lagre hot cue ${index + 1}` : `Hopp til hot cue ${index + 1}`}
          onClick={(e) =>
            void dispatch(
              e.shiftKey && time !== null
                ? { type: 'deck/deleteHotCue', deck: id, index }
                : { type: 'deck/hotCue', deck: id, index }
            )
          }
          onContextMenu={(e) => {
            e.preventDefault()
            if (time !== null) void dispatch({ type: 'deck/deleteHotCue', deck: id, index })
          }}
        >
          <span className="hotcue__num">{index + 1}</span>
          <span className="hotcue__time">{time === null ? 'Tom' : formatTime(time)}</span>
        </button>
      ))}
    </div>
  )
}

function Loops({ id, ready }: { id: DeckId; ready: boolean }): React.JSX.Element {
  const loop = useAppStore((s) => s.decks[id].loop)
  return (
    <div className="pads__row">
      <div className="loops" data-tour-id={deckTourId(id, 'loops')}>
        {LOOP_SIZES.map((beats) => (
          <button
            key={beats}
            type="button"
            disabled={!ready}
            className={`loop ${loop?.beats === beats ? 'loop--on' : ''}`}
            aria-pressed={loop?.beats === beats}
            aria-label={`Loop ${loopLabel(beats)} slag`}
            onClick={() => void dispatch({ type: 'deck/loop', deck: id, beats })}
          >
            {loopLabel(beats)}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="loop loop--exit"
        disabled={!loop}
        data-tour-id={deckTourId(id, 'loop-exit')}
        onClick={() => void dispatch({ type: 'deck/exitLoop', deck: id })}
      >
        Avslutt loop
      </button>
    </div>
  )
}

function Effects({ id }: { id: DeckId }): React.JSX.Element {
  const fx = useAppStore((s) => s.decks[id].fx)
  return (
    <div className="pads__row" data-tour-id={deckTourId(id, 'fx')} data-no-help>
      {FX_KINDS.map((kind) => (
        <div key={kind} className="fxunit">
          <button
            type="button"
            className={`fxunit__toggle ${fx[kind].on ? 'fxunit__toggle--on' : ''}`}
            aria-pressed={fx[kind].on}
            data-tour-id={deckTourId(id, FX_TOUR[kind])}
            onClick={() => void dispatch({ type: 'deck/toggleFx', deck: id, fx: kind })}
          >
            {FX_NAMES[kind]}
          </button>
          <Knob
            label="Mengde"
            ariaLabel={`${FX_NAMES[kind]} mengde, deck ${id}`}
            tourId={`${deckTourId(id, FX_TOUR[kind])}-amount`}
            min={0}
            max={1}
            defaultValue={0.5}
            value={fx[kind].amount}
            accent={id === 'A' ? 'a' : 'b'}
            valueText={`${Math.round(fx[kind].amount * 100)} %`}
            onChange={(value) => void dispatch({ type: 'deck/setFxAmount', deck: id, fx: kind, value })}
          />
        </div>
      ))}
    </div>
  )
}
