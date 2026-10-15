import { dispatch } from '../actions/dispatch'
import type { DeckId } from '../audio/types'
import { deckTourId } from '../help/tourIds'
import { useAppStore } from '../state/store'
import { Fader } from './Fader'
import { LevelMeterView } from './LevelMeterView'

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
        </div>
        <Channel id="B" />
      </div>

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

function Channel({ id }: { id: DeckId }): React.JSX.Element {
  const volume = useAppStore((s) => s.decks[id].volume)
  return (
    <div className={`mixer__channel mixer__channel--${id.toLowerCase()}`}>
      <div className="mixer__label">Volum {id}</div>
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
    </div>
  )
}
