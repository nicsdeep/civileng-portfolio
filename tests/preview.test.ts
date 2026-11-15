import { describe, expect, it } from 'vitest'
import { assertPublicUrl, isBlockedAddress, parseMeta } from '../api/_lib/preview'

describe('parseMeta', () => {
  it('reads Open Graph tags and resolves relative addresses', () => {
    const html = `<html><head>
      <title>Ignored when og:title exists</title>
      <meta property="og:title" content="MedMatch AI &amp; friends">
      <meta property="og:description" content="Matches healthcare providers with shifts.">
      <meta property="og:image" content="/cover.png">
      <meta property="og:site_name" content="MedMatch">
      <link rel="icon" href="/favicon-32.png" sizes="32x32">
      <link rel="apple-touch-icon" href="/apple.png">
    </head><body></body></html>`
    expect(parseMeta(html, 'https://med.example.app/about')).toEqual({
      title: 'MedMatch AI & friends',
      description: 'Matches healthcare providers with shifts.',
      siteName: 'MedMatch',
      image: 'https://med.example.app/cover.png',
      logo: 'https://med.example.app/apple.png',
    })
  })

  it('falls back to the title, first paragraph, first big picture and favicon', () => {
    const html = `<html><head><title>Bridge Monitor</title></head><body>
      <p>Short.</p>
      <p>A dashboard that shows live sensor readings from a pedestrian bridge, with alerts for unusual movement.</p>
      <img src="/icons/sprite.svg"><img src="images/deck.jpg" width="800">
    </body></html>`
    expect(parseMeta(html, 'https://www.bridge.example.org/')).toEqual({
      title: 'Bridge Monitor',
      description: 'A dashboard that shows live sensor readings from a pedestrian bridge, with alerts for unusual movement.',
      siteName: 'bridge.example.org',
      image: 'https://www.bridge.example.org/images/deck.jpg',
      logo: 'https://www.bridge.example.org/favicon.ico',
    })
  })

  it('never returns script addresses', () => {
    const html = `<meta property="og:image" content="javascript:alert(1)"><link rel="icon" href="data:image/png;base64,AAA">`
    const meta = parseMeta(html, 'https://example.com/')
    expect(meta.image).toBe('')
    expect(meta.logo).toBe('https://example.com/favicon.ico')
  })
})

describe('server-side request safety', () => {
  it('blocks internal and special addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isBlockedAddress(ip), ip).toBe(true)
    }
    for (const ip of ['8.8.8.8', '76.76.21.21', '2606:4700::6810:84e5']) expect(isBlockedAddress(ip), ip).toBe(false)
  })

  it('refuses unsafe addresses before any request is made', async () => {
    for (const url of ['ftp://example.com/x', 'http://user:pw@example.com/', 'http://localhost/', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/meta-data', 'https://example.com:8443/', 'http://printer.local/', 'not a url']) {
      await expect(assertPublicUrl(url), url).rejects.toThrow()
    }
  })
})
