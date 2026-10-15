import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APP_NAME } from '@shared/appInfo'
import { initEngine } from './actions/dispatch'
import { App } from './App'
import './styles.css'

document.title = APP_NAME
initEngine()

if (import.meta.env.DEV) {
  // Bare i utvikling: gjør det mulig å teste appen automatisk.
  void import('./debug').then((m) => m.exposeDebug())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
