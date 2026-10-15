import { describe, expect, it } from 'vitest'
import { HOT_CUE_COUNT, emptyCues, parseCues } from './cues'
import { interleaveToPcm16, wavHeader } from './wav'

describe('WAV', () => {
  it('lager et gyldig filhode', () => {
    const h = wavHeader(48000, 2, 1000)
    const view = new DataView(h.buffer)
    expect(String.fromCharCode(...h.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...h.slice(8, 12))).toBe('WAVE')
    expect(view.getUint32(4, true)).toBe(1036)
    expect(view.getUint32(24, true)).toBe(48000)
    expect(view.getUint32(28, true)).toBe(48000 * 4)
    expect(view.getUint32(40, true)).toBe(1000)
  })

  it('fletter kanaler og gjør om til 16 bit', () => {
    const bytes = interleaveToPcm16([new Float32Array([1, -1]), new Float32Array([0, 2])])
    expect(Array.from(new Int16Array(bytes.buffer))).toEqual([32767, 0, -32768, 32767])
  })
})

describe('cues', () => {
  it('godtar gyldige cues og avviser rot', () => {
    expect(parseCues(emptyCues())).toEqual(emptyCues())
    expect(parseCues({ cue: 1.5, hot: [1, null, 3, null] })).toEqual({ cue: 1.5, hot: [1, null, 3, null] })
    expect(parseCues({ cue: -1, hot: [null, null, null, null] })).toBeNull()
    expect(parseCues({ cue: null, hot: [1] })).toBeNull()
    expect(parseCues('hei')).toBeNull()
    expect(emptyCues().hot).toHaveLength(HOT_CUE_COUNT)
  })
})
