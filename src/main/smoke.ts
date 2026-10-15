import { writeFile } from 'node:fs/promises'
import { app, type BrowserWindow } from 'electron'

/**
 * Kun for utvikling: med MIKSEREN_SMOKE=<fil.png> logges feil fra grensesnittet,
 * det tas et skjermbilde, og appen avsluttes. Brukes for å sjekke at appen starter.
 */
export function setupSmokeTest(win: BrowserWindow): void {
  const target = process.env.MIKSEREN_SMOKE
  if (!target || app.isPackaged) return
  win.webContents.on('console-message', (event) => {
    console.log(`[renderer:${event.level}] ${event.message}`)
  })
  win.webContents.on('did-finish-load', () => {
    setTimeout(
      async () => {
        const script = process.env.MIKSEREN_SMOKE_SCRIPT
        if (script) {
          try {
            const result = await win.webContents.executeJavaScript(script)
            console.log('[smoke] resultat:', JSON.stringify(result))
          } catch (err) {
            console.log('[smoke] skriptfeil:', err)
          }
        }
        const image = await win.webContents.capturePage()
        await writeFile(target, image.toPNG())
        console.log('[smoke] skjermbilde lagret:', target)
        app.quit()
      },
      Number(process.env.MIKSEREN_SMOKE_DELAY ?? 2500)
    )
  })
}
