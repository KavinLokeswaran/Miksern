import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ScanProgress } from '../../shared/library'
import { findAudioFiles, readTrackInfo, repairMojibake, scanFolder, trackId } from './scan'

/** Lager en gyldig, stille WAV-fil (16 bit mono). */
function wav(seconds: number, sampleRate = 8000): Buffer {
  const dataSize = seconds * sampleRate * 2
  const b = Buffer.alloc(44 + dataSize)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + dataSize, 4)
  b.write('WAVE', 8)
  b.write('fmt ', 12)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(sampleRate, 24)
  b.writeUInt32LE(sampleRate * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(dataSize, 40)
  return b
}

async function makeLibrary(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mikseren-lib-'))
  await mkdir(join(root, 'Undermappe', 'Dypere'), { recursive: true })
  await mkdir(join(root, '.skjult'))
  await writeFile(join(root, 'Første låt.wav'), wav(2))
  await writeFile(join(root, 'Undermappe', 'Dypere', 'Andre.WAV'), wav(3))
  await writeFile(join(root, 'Undermappe', 'Beskyttet.m4p'), Buffer.from('ikke lyd'))
  await writeFile(join(root, 'Undermappe', 'Ødelagt.flac'), Buffer.from('dette er ikke flac'))
  await writeFile(join(root, 'notater.txt'), 'hei')
  await writeFile(join(root, '.skjult', 'gjemt.wav'), wav(1))
  return root
}

describe('mappeskanning', () => {
  it('finner lydfiler i undermapper, men ikke skjulte mapper eller andre filtyper', async () => {
    const root = await makeLibrary()
    const files = await findAudioFiles(root)
    const names = files.map((f) => f.slice(root.length + 1)).sort()
    expect(names).toEqual(['Første låt.wav', 'Undermappe/Beskyttet.m4p', 'Undermappe/Dypere/Andre.WAV', 'Undermappe/Ødelagt.flac'])
  })

  it('leser lengde og bruker filnavnet som tittel', async () => {
    const root = await makeLibrary()
    const path = join(root, 'Første låt.wav')
    const info = await readTrackInfo(path, 1, 1)
    expect(info.title).toBe('Første låt')
    expect(info.ext).toBe('wav')
    expect(info.duration).toBeCloseTo(2, 1)
    expect(info.status).toBe('ok')
    expect(info.id).toBe(trackId(path))
  })

  it('merker kopibeskyttede og ødelagte filer uten å krasje', async () => {
    const root = await makeLibrary()
    const tracks = Object.values(await scanFolder(root, {}, () => {}))
    const byName = Object.fromEntries(tracks.map((t) => [t.fileName, t.status]))
    expect(byName['Beskyttet']).toBe('protected')
    expect(byName['Ødelagt']).toBe('unreadable')
    expect(byName['Andre']).toBe('ok')
  })

  it('gjenbruker uendrede filer og melder fremdrift', async () => {
    const root = await makeLibrary()
    const first = await scanFolder(root, {}, () => {})
    const anyId = Object.keys(first)[0]
    const marked = { ...first, [anyId]: { ...first[anyId], title: 'Fra hurtigbuffer' } }
    const progress: ScanProgress[] = []
    const second = await scanFolder(root, marked, (p) => progress.push(p))
    expect(second[anyId].title).toBe('Fra hurtigbuffer')
    expect(progress).toContainEqual({ phase: 'reading', done: 4, total: 4 })
    expect(progress.at(-1)).toEqual({ phase: 'idle' })
  })
})

describe('tegnfeil i tagger', () => {
  it('retter UTF-8 som er lest som Latin-1', () => {
    expect(repairMojibake('BÃ¸lger')).toBe('Bølger')
    expect(repairMojibake('Ã\u0085se & Co')).toBe('Åse & Co')
    expect(repairMojibake('CafÃ© del Mar')).toBe('Café del Mar')
  })

  it('lar riktig tekst være i fred', () => {
    for (const ok of ['Bølger', 'Åse', 'Café', 'AC/DC', 'Sigur Rós', 'Ünïcødé ÿ', '東京']) {
      expect(repairMojibake(ok)).toBe(ok)
    }
  })
})
