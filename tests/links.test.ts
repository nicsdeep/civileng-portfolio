import { afterEach, describe, expect, it, vi } from 'vitest'
import { autoLabel, cleanUrl, faviconFor, findImage, projectFromPreview, screenshotFor, type LinkPreview } from '../src/features/links/preview'

const page = (over: Partial<LinkPreview>): LinkPreview => ({
  url: 'https://x.example', finalUrl: 'https://x.example/', kind: 'page', title: '', description: '', siteName: 'x.example', image: '', logo: '', ...over,
})
function serve(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })))
}
afterEach(() => vi.unstubAllGlobals())

describe('paste a link → picture', () => {
  it('uses image links as they are, without asking the server', async () => {
    serve({})
    expect(await findImage('https://cdn.example/me.JPG?v=2', 'photo')).toEqual({ image: 'https://cdn.example/me.JPG?v=2', note: 'Picture added.' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('finds a profile photo, a company logo, or a project picture from a page', async () => {
    serve(page({ image: 'https://avatars.example/u/1', logo: 'https://x.example/apple.png' }))
    expect((await findImage('github.com/jane', 'photo')).image).toBe('https://avatars.example/u/1')
    expect((await findImage('github.com/jane', 'logo')).image).toBe('https://x.example/apple.png')
    expect((await findImage('github.com/jane', 'cover')).image).toBe('https://avatars.example/u/1')
  })

  it('falls back to a logo service or a screenshot when a site cannot be read', async () => {
    serve({ error: 'That page could not be opened.' }, false)
    expect((await findImage('https://www.uonbi.ac.ke', 'logo')).image).toBe(faviconFor('https://www.uonbi.ac.ke/'))
    expect((await findImage('https://med.example.app', 'cover')).image).toBe(screenshotFor('https://med.example.app/'))
    await expect(findImage('https://med.example.app', 'photo')).rejects.toThrow('could not be opened')
  })

  it('rejects things that are not web addresses', async () => {
    await expect(findImage('hello', 'cover')).rejects.toThrow('Paste a full web address')
    expect(cleanUrl('example.com/a')).toBe('https://example.com/a')
    expect(cleanUrl('localhost')).toBe('')
  })
})

describe('paste a link → project', () => {
  it('turns a GitHub page into a tidy project', () => {
    const p = projectFromPreview(page({
      finalUrl: 'https://github.com/jane/bridge-monitor', siteName: 'GitHub', image: 'https://opengraph.example/x.png',
      title: 'GitHub - jane/bridge-monitor: Live sensor dashboard for a footbridge',
      description: 'Live sensor dashboard. Contribute to jane/bridge-monitor development by creating an account on GitHub.',
    }), 'github.com/jane/bridge-monitor')
    expect(p).toEqual({
      title: 'bridge monitor', subtitle: 'Open-source project', description: 'Live sensor dashboard for a footbridge',
      image: 'https://opengraph.example/x.png', links: [{ label: 'Source code', url: 'https://github.com/jane/bridge-monitor' }],
    })
  })

  it('uses a screenshot when a live site has no preview picture', () => {
    const p = projectFromPreview(page({ finalUrl: 'https://med-match.example.app/', title: 'MedMatchAI System', description: 'Matching platform', siteName: 'med-match.example.app' }), 'med-match.example.app')
    expect(p.image).toBe(screenshotFor('https://med-match.example.app/'))
    expect(p.links).toEqual([{ label: 'Live site', url: 'https://med-match.example.app/' }])
  })

  it('labels links by themselves', () => {
    expect(autoLabel({ label: '', url: 'linkedin.com/in/jane' })).toEqual({ label: 'LinkedIn', url: 'https://linkedin.com/in/jane' })
    expect(autoLabel({ label: 'Mine', url: 'https://jane.dev' })).toEqual({ label: 'Mine', url: 'https://jane.dev' })
  })
})
