/**
 * Lager .dmg-installasjonsfila for Mac.
 * Kjør med: npm run dist:mac  (fila havner i mappa release/)
 *
 * Selve byggingen skjer i en midlertidig mappe utenfor prosjektet. Ligger prosjektet
 * i iCloud Drive (f.eks. under Dokumenter), legger iCloud skjulte merker på filene,
 * og da klarer ikke macOS å signere appen.
 */
const { build } = require('electron-builder')
const { copyFileSync, mkdirSync, readdirSync, rmSync } = require('node:fs')
const { homedir } = require('node:os')
const { join } = require('node:path')
const config = require('../electron-builder.config.cjs')

const root = join(__dirname, '..')
const temp = join(homedir(), 'Library', 'Caches', 'mikseren-bygg')
const release = join(root, 'release')

async function main() {
  rmSync(temp, { recursive: true, force: true })
  await build({
    projectDir: root,
    mac: ['dmg'],
    config: { ...config, directories: { ...config.directories, output: temp } }
  })
  mkdirSync(release, { recursive: true })
  for (const file of readdirSync(temp).filter((f) => f.endsWith('.dmg'))) {
    copyFileSync(join(temp, file), join(release, file))
    console.log(`\nFerdig! Installasjonsfila ligger her: release/${file}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
