import { describe, expect, it } from 'vitest'
import { dateRange, normalizeCv, safeUrl } from '../src/content/normalize'
import { bundledCv } from '../src/content/cv'

describe('safeUrl', () => {
  it('keeps web and email links', () => {
    expect(safeUrl('https://github.com/nicsdee')).toBe('https://github.com/nicsdee')
    expect(safeUrl(' http://example.com ')).toBe('http://example.com')
    expect(safeUrl('mailto:someone@example.com')).toBe('mailto:someone@example.com')
  })

  it('drops scripts, relative paths and junk', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('')
    expect(safeUrl('JavaScript:alert(1)')).toBe('')
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(safeUrl('/projects')).toBe('')
    expect(safeUrl('github.com/nicsdee')).toBe('')
    expect(safeUrl(42)).toBe('')
  })
})

describe('normalizeCv', () => {
  it('leaves the bundled CV unchanged', () => {
    expect(normalizeCv(bundledCv)).toEqual(bundledCv)
  })

  it('turns anything into a complete, empty CV', () => {
    for (const input of [null, undefined, 'text', 3, [], { name: 7, projects: 'x', skills: [null] }]) {
      const cv = normalizeCv(input)
      expect(cv.name).toBe('')
      expect(cv.projects).toEqual([])
      expect(cv.skills).toEqual([])
    }
  })

  it('trims text, drops empty entries and unknown keys', () => {
    const cv = normalizeCv({
      name: '  Ada  ',
      evil: '<script>',
      interests: ['  AI ', '', '   '],
      experience: [{ role: '', org: '' }, { role: 'Engineer', bullets: ['one', ' ', 'two '] }],
      projects: [{ title: 'P', tech: ['a', ''], links: [{ label: '', url: 'https://x.dev' }, { label: 'bad', url: 'javascript:x' }], featured: 'yes' }],
    })
    expect(cv).not.toHaveProperty('evil')
    expect(cv.name).toBe('Ada')
    expect(cv.interests).toEqual(['AI'])
    expect(cv.experience).toHaveLength(1)
    expect(cv.experience[0].bullets).toEqual(['one', 'two'])
    expect(cv.projects[0].tech).toEqual(['a'])
    expect(cv.projects[0].links).toEqual([{ label: 'https://x.dev', url: 'https://x.dev' }])
    expect(cv.projects[0].featured).toBe(false)
  })

  it('rejects an invalid email and limits long text', () => {
    const cv = normalizeCv({ email: 'not an email', headline: 'x'.repeat(1000) })
    expect(cv.email).toBe('')
    expect(cv.headline).toHaveLength(300)
  })
})

describe('dateRange', () => {
  it('formats ranges', () => {
    expect(dateRange('07/2022', '')).toBe('07/2022 – Present')
    expect(dateRange('03/2026', '05/2026')).toBe('03/2026 – 05/2026')
    expect(dateRange('', '2024')).toBe('2024')
  })
})
