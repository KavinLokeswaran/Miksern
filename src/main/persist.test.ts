import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JsonFile } from './persist'

const tempFile = async (): Promise<string> => join(await mkdtemp(join(tmpdir(), 'mikseren-')), 'data.json')

describe('JsonFile', () => {
  it('starter med standardverdier og lagrer endringer', async () => {
    const file = await tempFile()
    const store = new JsonFile(file, () => ({ count: 0 }))
    store.update((d) => ({ count: d.count + 1 }))
    store.flush()
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ count: 1 })
    expect(new JsonFile(file, () => ({ count: 0 })).get()).toEqual({ count: 1 })
  })

  it('tåler en ødelagt fil', async () => {
    const file = await tempFile()
    await writeFile(file, '{ikke json')
    expect(new JsonFile(file, () => ({ ok: true })).get()).toEqual({ ok: true })
  })

  it('bruker standardverdier når migreringen avviser innholdet', async () => {
    const file = await tempFile()
    await writeFile(file, JSON.stringify({ version: 99 }))
    const store = new JsonFile(file, () => ({ version: 1 }), (raw) => ((raw as { version: number }).version === 1 ? (raw as { version: 1 }) : null))
    expect(store.get()).toEqual({ version: 1 })
  })
})
