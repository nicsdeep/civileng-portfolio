import { describe, expect, it } from 'vitest'
import { passwordProblem, safeNext } from '../src/features/auth/validation'

describe('safeNext', () => {
  it('keeps same-site paths', () => expect(safeNext('/account?x=1')).toBe('/account?x=1'))
  it('blocks other sites and falls back to the editor', () => {
    expect(safeNext('https://evil.example')).toBe('/editor')
    expect(safeNext('//evil.example')).toBe('/editor')
    expect(safeNext(null)).toBe('/editor')
  })
})

describe('passwordProblem', () => {
  it('requires 8+ characters with letters and digits', () => {
    expect(passwordProblem('short1')).toMatch(/8 characters/)
    expect(passwordProblem('onlyletters')).toMatch(/letters and numbers/)
    expect(passwordProblem('12345678')).toMatch(/letters and numbers/)
    expect(passwordProblem('bridge2026')).toBeNull()
  })
})
