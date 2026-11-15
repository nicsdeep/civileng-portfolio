/**
 * Link previews: reads the title, description, picture and logo of a web
 * page so the editor can fill in a project, logo or photo from a pasted
 * link. Runs on the server (Vercel function), because browsers cannot read
 * other sites directly.
 *
 * Safety (this fetches addresses typed by users):
 *   - only http(s) on standard ports, no credentials in the address;
 *   - every hostname is resolved and refused if it points to a private,
 *     loopback, link-local or otherwise internal address (also after each
 *     redirect, at most 3);
 *   - 6 second timeout, at most 1.5 MB read, only the summary is returned.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export interface LinkPreview {
  url: string
  /** Address after redirects. */
  finalUrl: string
  kind: 'page' | 'image'
  title: string
  description: string
  siteName: string
  /** Large picture for the page (og:image), or the address itself for images. */
  image: string
  /** Small square logo or icon for the site. */
  logo: string
}

export class PreviewError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const TIMEOUT_MS = 6000
const MAX_BYTES = 1_500_000
const MAX_REDIRECTS = 3

/** True for addresses that must never be fetched from the server. */
export function isBlockedAddress(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  if (v === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::' || lower === '::1') return true
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isBlockedAddress(mapped[1])
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(lower)
  }
  return true
}

/** Checks the address is a public web page; throws a PreviewError otherwise. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new PreviewError(400, 'That does not look like a web address.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new PreviewError(400, 'Only web addresses (http or https) can be read.')
  if (url.username || url.password) throw new PreviewError(400, 'That address cannot be read.')
  if (url.port && !['80', '443'].includes(url.port)) throw new PreviewError(400, 'That address cannot be read.')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!host.includes('.') || /\.(local|internal|localhost)$/i.test(host)) throw new PreviewError(400, 'That address cannot be read.')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (addresses.length === 0) throw new PreviewError(404, 'That website could not be found.')
  if (addresses.some((a) => isBlockedAddress(a.address))) throw new PreviewError(400, 'That address cannot be read.')
  return url
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decode(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : ''
}

function absolute(href: string, base: string): string {
  if (!href) return ''
  try {
    const url = new URL(href, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

/** Reads the page summary from its HTML (Open Graph, Twitter cards, then plain tags). */
export function parseMeta(html: string, pageUrl: string): Omit<LinkPreview, 'url' | 'finalUrl' | 'kind'> {
  const head = html.slice(0, 400_000)
  const meta: Record<string, string> = {}
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, 'property') || attr(tag, 'name') || attr(tag, 'itemprop')).toLowerCase()
    const content = attr(tag, 'content')
    if (key && content && !(key in meta)) meta[key] = content
  }
  const base = absolute(head.match(/<base\b[^>]*>/i)?.[0] ? attr(head.match(/<base\b[^>]*>/i)![0], 'href') : '', pageUrl) || pageUrl

  const icons = (head.match(/<link\b[^>]*>/gi) ?? [])
    .map((tag) => ({ rel: attr(tag, 'rel').toLowerCase(), href: absolute(attr(tag, 'href'), base), sizes: attr(tag, 'sizes') }))
    .filter((l) => l.href && /\bicon\b|apple-touch-icon/.test(l.rel))
    .sort((a, b) => score(b) - score(a))
  function score(l: { rel: string; sizes: string }) {
    const size = Number(l.sizes.split('x')[0]) || 0
    return (l.rel.includes('apple-touch-icon') ? 1000 : 0) + Math.min(size, 512)
  }

  const title = meta['og:title'] || meta['twitter:title'] || decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') || decode(head.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  let description = meta['og:description'] || meta['twitter:description'] || meta['description'] || ''
  if (!description) {
    // First real paragraph of the page, e.g. a project's "About" text.
    for (const p of html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) ?? []) {
      const text = decode(p.replace(/<[^>]+>/g, ' '))
      if (text.length >= 60) {
        description = text
        break
      }
    }
  }
  let image = absolute(meta['og:image:secure_url'] || meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || meta['twitter:image:src'] || meta['image'] || '', base)
  if (!image) {
    // First sizeable picture on the page.
    for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
      const src = absolute(attr(tag, 'src') || attr(tag, 'data-src'), base)
      const width = Number(attr(tag, 'width')) || 0
      if (src && !/\.svg(\?|$)|sprite|pixel|spacer|1x1/i.test(src) && (width === 0 || width >= 200)) {
        image = src
        break
      }
    }
  }
  const logo = icons[0]?.href || absolute('/favicon.ico', base)
  const host = new URL(pageUrl).hostname.replace(/^www\./, '')
  return {
    title: decode(title).slice(0, 200),
    description: decode(description).slice(0, 600),
    siteName: (meta['og:site_name'] || meta['application-name'] || host).slice(0, 100),
    image,
    logo,
  }
}

/** Fetches a page (following safe redirects) and returns its summary. */
export async function fetchPreview(raw: string): Promise<LinkPreview> {
  let url = await assertPublicUrl(raw.trim())
  let response: Response | null = null
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; CivilEngPortfolioBot/1.0; +https://civileng-portfolio.vercel.app)',
        accept: 'text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5',
        'accept-language': 'en',
      },
    }).catch(() => {
      throw new PreviewError(502, 'That website did not respond. Check the link and try again.')
    })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      url = await assertPublicUrl(new URL(location, url).href)
      continue
    }
    break
  }
  if (!response || response.status >= 300) throw new PreviewError(502, 'That page could not be opened. Check the link and try again.')

  const type = response.headers.get('content-type') ?? ''
  const finalUrl = url.href
  if (type.startsWith('image/')) {
    response.body?.cancel().catch(() => {})
    return { url: raw, finalUrl, kind: 'image', title: '', description: '', siteName: url.hostname.replace(/^www\./, ''), image: finalUrl, logo: '' }
  }
  if (!/html|xml/.test(type)) throw new PreviewError(415, 'That link is not a web page or a picture.')

  const html = await readLimited(response)
  return { url: raw, finalUrl, kind: 'page', ...parseMeta(html, finalUrl) }
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
  }
  reader.cancel().catch(() => {})
  return new TextDecoder().decode(Buffer.concat(chunks))
}
