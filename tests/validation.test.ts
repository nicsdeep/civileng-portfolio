import { describe, expect, it } from 'vitest'
import { safeNext } from '../src/features/auth/validation'

describe('safeNext', () => {
  it('keeps same-site paths', () => expect(safeNext('/account?x=1')).toBe('/account?x=1'))
  it('blocks other sites and falls back to my portfolio', () => {
    expect(safeNext('https://evil.example')).toBe('/me')
    expect(safeNext('//evil.example')).toBe('/me')
    expect(safeNext(null)).toBe('/me')
  })
})
