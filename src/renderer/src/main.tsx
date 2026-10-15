import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APP_NAME } from '@shared/appInfo'
import { dispatch, initEngine, initLibrary, onAction } from './actions/dispatch'
import { initLearning } from './learn/learnController'
import { initTips } from './tips/tipController'
import { App } from './App'
import './styles.css'

document.title = APP_NAME
initEngine()
void initLibrary()
initLearning(dispatch, (listener) => onAction((action) => listener(action)))
initTips((listener) => onAction((action) => listener(action)))

if (import.meta.env.DEV) {
  // Bare i utvikling: gjør det mulig å teste appen automatisk.
  void import('./debug').then((m) => m.exposeDebug())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
