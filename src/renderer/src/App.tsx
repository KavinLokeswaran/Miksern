import { APP_NAME } from '@shared/appInfo'
import { DeckPanel } from './components/DeckPanel'
import { HelpBubble } from './components/HelpBubble'
import { HelpMenu } from './components/HelpMenu'
import { LibraryPanel } from './components/LibraryPanel'
import { Mixer } from './components/Mixer'
import { ModeSwitch } from './components/ModeSwitch'
import { RecordButton } from './components/RecordButton'
import { Toast } from './components/Toast'
import { TourOverlay } from './components/TourOverlay'
import { WaveformRow } from './components/WaveformRow'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'

export function App(): React.JSX.Element {
  useKeyboardShortcuts()
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__name">{APP_NAME}</div>
        <div className="topbar__hint">Hold musa over en kontroll for å se hva den gjør</div>
        <RecordButton />
        <ModeSwitch />
        <HelpMenu />
      </header>
      <WaveformRow />
      <main className="stage">
        <DeckPanel id="A" />
        <Mixer />
        <DeckPanel id="B" />
      </main>
      <LibraryPanel />
      <HelpBubble />
      <TourOverlay />
      <Toast />
    </div>
  )
}
