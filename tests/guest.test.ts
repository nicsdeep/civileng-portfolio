import { describe, expect, it } from 'vitest'
import { GUEST_UNTIL, guestMode, isGuest } from '../src/features/auth/guest'

describe('guest publishing window', () => {
  it('is on until GUEST_UNTIL and off after', () => {
    expect(guestMode(GUEST_UNTIL.getTime() - 1)).toBe(true)
    expect(guestMode(GUEST_UNTIL.getTime())).toBe(false)
    expect(GUEST_UNTIL.toISOString()).toBe('2026-11-27T05:30:00.000Z')
  })
  it('knows guests from email accounts', () => {
    expect(isGuest({ is_anonymous: true } as never)).toBe(true)
    expect(isGuest({ is_anonymous: false } as never)).toBe(false)
    expect(isGuest(null)).toBe(false)
  })
})
