import { dispatch } from '../actions/dispatch'
import { eqDb, trimDb, type EqBand } from '../audio/toneMath'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { useGroupVisible } from '../learn/useGroupVisible'
import { useAppStore } from '../state/store'
import { ClipWarning } from './ClipWarning'
import { Fader } from './Fader'
import { Knob } from './Knob'
import { LevelMeterView } from './LevelMeterView'
import { LimiterLamp } from './LimiterLamp'

const dbText = (db: number): string => `${db > 0 ? '+' : ''}${Math.round(db)} dB`

export function Mixer(): React.JSX.Element {
  const crossfader = useAppStore((s) => s.mixer.crossfader)
  const master = useAppStore((s) => s.mixer.masterVolume)

  return (
    <section className="mixer" aria-label="Mikser">
      <div className="mixer__channels">
        <Channel id="A" />
        <div className="mixer__master">
          <div className="mixer__label">Master</div>
          <div className="mixer__strip">
            <Fader
              orientation="vertical"
              value={master}
              label="Mastervolum"
              tourId="master-volume"
              resetValue={0.8}
              onChange={(value) => void dispatch({ type: 'mixer/setMasterVolume', value })}
              className="fader--master"
            />
            <LevelMeterView target="master" tourId="master-meter" label="Masternivå" />
          </div>
          <LimiterLamp />
        </div>
        <Channel id="B" />
      </div>

      <ClipWarning />

      <div className="mixer__xfader">
        <span className="mixer__xfader-end mixer__xfader-end--a">A</span>
        <Fader
          orientation="horizontal"
          value={crossfader}
          label="Krysslider"
          tourId="crossfader"
          resetValue={0.5}
          onChange={(value) => void dispatch({ type: 'mixer/setCrossfader', value })}
          className="fader--xfader"
        />
        <span className="mixer__xfader-end mixer__xfader-end--b">B</span>
      </div>
      <div className="mixer__xfader-label">Krysslider (crossfader)</div>
    </section>
  )
}

const EQ_KNOBS: { band: EqBand; label: string; name: string; tour: 'eq-high' | 'eq-mid' | 'eq-low' }[] = [
  { band: 'high', label: 'Diskant', name: 'Diskant', tour: 'eq-high' },
  { band: 'mid', label: 'Mellom', name: 'Mellomtone', tour: 'eq-mid' },
  { band: 'low', label: 'Bass', name: 'Bass', tour: 'eq-low' }
]

function ToneKnobs({ id }: { id: DeckId }): React.JSX.Element | null {
  const trim = useAppStore((s) => s.decks[id].trim)
  const eq = useAppStore((s) => s.decks[id].eq)
  const filter = useAppStore((s) => s.decks[id].filter)
  const showTrim = useGroupVisible('trim')
  const showEq = useGroupVisible('eq')
  const showFilter = useGroupVisible('filter')
  const accent = id === 'A' ? 'a' : 'b'
  if (!showTrim && !showEq && !showFilter) return null
  return (
    <div className="mixer__knobs">
      {showTrim && (
        <Knob
          label="Trim"
          ariaLabel={`Trim deck ${id}`}
          tourId={deckTourId(id, 'trim')}
          value={trim}
          accent={accent}
          valueText={dbText(trimDb(trim))}
          onChange={(value) => void dispatch({ type: 'deck/setTrim', deck: id, value })}
        />
      )}
      {showEq &&
        EQ_KNOBS.map((k) => (
          <Knob
            key={k.band}
            label={k.label}
            ariaLabel={`${k.name} deck ${id}`}
            tourId={deckTourId(id, k.tour)}
            value={eq[k.band]}
            accent={accent}
            valueText={eq[k.band] <= -0.999 ? 'Kill' : dbText(eqDb(eq[k.band]))}
            onChange={(value) => void dispatch({ type: 'deck/setEq', deck: id, band: k.band, value })}
          />
        ))}
      {showFilter && (
        <Knob
          label="Filter"
          ariaLabel={`Filter deck ${id}`}
          tourId={deckTourId(id, 'filter')}
          value={filter}
          accent={accent}
          valueText={filter < -0.03 ? 'Lavpass' : filter > 0.03 ? 'Høypass' : 'Av'}
          onChange={(value) => void dispatch({ type: 'deck/setFilter', deck: id, value })}
        />
      )}
    </div>
  )
}

function Channel({ id }: { id: DeckId }): React.JSX.Element {
  const volume = useAppStore((s) => s.decks[id].volume)
  const strip = (
    <div className="mixer__strip">
      {id === 'B' && <LevelMeterView target={id} tourId={deckTourId(id, 'meter')} label={`Nivå deck ${id}`} />}
      <Fader
        orientation="vertical"
        value={volume}
        label={`Volum deck ${id}`}
        tourId={deckTourId(id, 'volume')}
        onChange={(value) => void dispatch({ type: 'deck/setVolume', deck: id, value })}
        className={`fader--${id.toLowerCase()}`}
      />
      {id === 'A' && <LevelMeterView target={id} tourId={deckTourId(id, 'meter')} label={`Nivå deck ${id}`} />}
    </div>
  )
  return (
    <div className={`mixer__channel mixer__channel--${id.toLowerCase()}`}>
      <div className="mixer__label">Kanal {id}</div>
      <div className="mixer__channel-body">
        {id === 'A' && <ToneKnobs id={id} />}
        <div className="mixer__fader-col">
          {strip}
          <span className="mixer__sublabel">Volum</span>
        </div>
        {id === 'B' && <ToneKnobs id={id} />}
      </div>
    </div>
  )
}
