import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ dialog: {} }))

const { allowFile, readAudioFile } = await import('./fileAccess')

describe('filtilgang', () => {
  it('nekter å lese filer brukeren ikke har valgt', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mikseren-'))
    const file = join(dir, 'lat.wav')
    await writeFile(file, 'data')
    expect(await readAudioFile(file)).toEqual({ ok: false, reason: 'not-allowed' })
    expect(await readAudioFile(42)).toEqual({ ok: false, reason: 'not-allowed' })
  })

  it('leser valgte filer, og gir vennlig svar hvis fila er borte', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mikseren-'))
    const file = join(dir, 'lat.wav')
    await writeFile(file, 'data')
    allowFile(file)
    const result = await readAudioFile(file)
    expect(result.ok && Buffer.from(result.data).toString()).toBe('data')

    const missing = join(dir, 'borte.wav')
    allowFile(missing)
    expect(await readAudioFile(missing)).toEqual({ ok: false, reason: 'not-found' })
  })
})
