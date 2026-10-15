/**
 * Lager build/icon.png (1024×1024) fra build/icon.svg.
 * Kjør med: npm run icon
 * electron-builder lager selve Mac-ikonet (.icns) fra PNG-fila.
 */
const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'), 'utf8')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true }
  })
  win.webContents.setZoomFactor(1)
  const html = `<html><body style="margin:0;background:transparent">${svg}</body></html>`
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise((r) => setTimeout(r, 300))
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })
  writeFileSync(join(root, 'build', 'icon.png'), image.resize({ width: 1024, height: 1024 }).toPNG())
  console.log('Lagret build/icon.png')
  app.quit()
})
