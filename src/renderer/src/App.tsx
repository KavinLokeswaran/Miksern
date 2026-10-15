import { APP_NAME } from '@shared/appInfo'
import { DeckPanel } from './components/DeckPanel'
import { HelpBubble } from './components/HelpBubble'
import { Mixer } from './components/Mixer'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'

export function App(): React.JSX.Element {
  useKeyboardShortcuts()
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__name">{APP_NAME}</div>
        <div className="topbar__hint">Hold musa over en kontroll for å se hva den gjør</div>
      </header>
      <main className="stage">
        <DeckPanel id="A" />
        <Mixer />
        <DeckPanel id="B" />
      </main>
      <section className="library-placeholder">
        <p>Last inn en låt på hver deck med «Åpne fil …». Musikkbiblioteket kommer her senere.</p>
      </section>
      <HelpBubble />
    </div>
  )
}
