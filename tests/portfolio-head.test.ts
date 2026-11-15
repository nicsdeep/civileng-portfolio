import { describe, expect, it } from 'vitest'
import { initials, personFromContent, personalizeHtml } from '../api/_lib/portfolio-head'

const shell = `<!doctype html><html><head>
    <meta name="description" content="CivilEng Portfolio: upload" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="CivilEng Portfolio" />
    <meta property="og:image" content="/icon-512.png" />
    <title>CivilEng Portfolio</title>
  </head><body><div id="root"></div></body></html>`

describe('shared portfolio page head', () => {
  it('shows only the person: name, headline, photo and initials icon', () => {
    const html = personalizeHtml(shell, { name: 'Jane Doe', headline: 'Site Engineer', photo: 'https://img.example.com/jane.jpg' }, 'https://x.app/p/jane-doe')
    expect(html).not.toMatch(/CivilEng/)
    expect(html).not.toMatch(/favicon\.svg|icon-512|site\.webmanifest/)
    expect(html).toContain('<title>Jane Doe · Site Engineer</title>')
    expect(html).toContain('<meta property="og:image" content="https://img.example.com/jane.jpg" />')
    expect(html).toContain('<meta property="og:url" content="https://x.app/p/jane-doe" />')
    expect(html).toContain('<div id="root"></div>')
  })

  it('escapes text and drops unsafe photos', () => {
    const html = personalizeHtml(shell, { name: '<script>x</script> "Q"', photo: 'javascript:alert(1)' }, 'https://x.app/p/q')
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('og:image')
  })

  it('reads stored content and makes initials', () => {
    expect(personFromContent({ name: ' Jane Doe ', headline: 'Engineer' })).toEqual({ name: 'Jane Doe', headline: 'Engineer', summary: '', photo: '' })
    expect(personFromContent({ headline: 'x' })).toBeNull()
    expect(personFromContent(null)).toBeNull()
    expect(initials('jane wanjiru doe')).toBe('JW')
  })
})
