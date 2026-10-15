/**
 * Oppsett for pakking av appen (electron-builder).
 * Appnavnet og app-ID-en hentes fra src/shared/appInfo.ts, så de bare står ett sted.
 */
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const appInfo = readFileSync(join(__dirname, 'src/shared/appInfo.ts'), 'utf8')
const read = (key) => {
  const match = new RegExp(`${key} = '([^']+)'`).exec(appInfo)
  if (!match) throw new Error(`Fant ikke ${key} i appInfo.ts`)
  return match[1]
}
const productName = read('APP_NAME')

module.exports = {
  appId: read('APP_ID'),
  productName,
  directories: { output: 'release', buildResources: 'build' },
  files: ['out/**/*', 'package.json'],
  npmRebuild: false,
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    category: 'public.app-category.music',
    icon: 'build/icon.png',
    // Ikke signert med Apple-sertifikat. «-» gir en lokal (ad hoc) signatur, som Apple Silicon krever.
    identity: '-',
    hardenedRuntime: false,
    gatekeeperAssess: false
  },
  dmg: {
    title: productName,
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  // Forberedt for en Windows-versjon senere (ikke testet).
  win: {
    target: 'nsis',
    icon: 'build/icon.png'
  }
}
