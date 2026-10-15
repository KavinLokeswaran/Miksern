import { describe, expect, it } from 'vitest'
import { defaultSettings, parseSettingsPatch } from './settings'

describe('innstillinger', () => {
  it('starter i Enkel modus med grunnkurset og tips på', () => {
    expect(defaultSettings()).toMatchObject({ advancedMode: false, introDone: false, tipsEnabled: true })
  })

  it('godtar bare gyldige felter', () => {
    expect(parseSettingsPatch({ advancedMode: true, hacker: 1 })).toEqual({ advancedMode: true })
    expect(parseSettingsPatch({ completedLessons: ['a', 'a', 'b'] })).toEqual({ completedLessons: ['a', 'b'] })
    expect(parseSettingsPatch({ completedLessons: [1] })).toEqual({})
    expect(parseSettingsPatch(null)).toBeNull()
  })
})
