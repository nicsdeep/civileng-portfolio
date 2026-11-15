/*
 * Paste a link, get the right picture or details. Used by every field that
 * takes a picture or link (see docs/PRD.md § Paste a link):
 *   - photo:  a profile page (GitHub, LinkedIn…) → its picture
 *   - logo:   a company or school website → its logo/icon
 *   - cover:  a project page → its preview picture, or a screenshot
 * Image links are used as they are. The page itself is read by /api/preview.
 */

export interface LinkPreview {
  url: string
  finalUrl: string
  kind: 'page' | 'image'
  title: string
  description: string
  siteName: string
  image: string
  logo: string
}

export type ImageMode = 'photo' | 'logo' | 'cover'

const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i

/** Adds https:// when someone pastes "example.com/page". */
export function cleanUrl(input: string): string {
  const text = input.trim()
  if (!text) return ''
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('.') ? parsed.href : ''
  } catch {
    return ''
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Reads a page's title, description, picture and logo through the site's own server. */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`)
  const body = (await response.json().catch(() => ({}))) as Partial<LinkPreview> & { error?: string }
  if (!response.ok) throw new Error(body.error || 'That link could not be read.')
  return body as LinkPreview
}

/** Always-available fallbacks when a site does not describe itself. */
export const faviconFor = (url: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=128`
export const screenshotFor = (url: string) => `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1200`

/** The best picture for a pasted link, for the given use. */
export async function findImage(input: string, mode: ImageMode): Promise<{ image: string; note: string }> {
  const url = cleanUrl(input)
  if (!url) throw new Error('Paste a full web address, e.g. https://example.com')
  if (IMAGE_FILE.test(new URL(url).pathname)) return { image: url, note: 'Picture added.' }
  const host = hostOf(url)
  try {
    const preview = await fetchLinkPreview(url)
    if (preview.kind === 'image') return { image: preview.image, note: 'Picture added.' }
    if (mode === 'logo') return { image: preview.logo || faviconFor(url), note: `Logo found on ${host}.` }
    if (preview.image) return { image: preview.image, note: `Picture found on ${host}.` }
    if (mode === 'cover') return { image: screenshotFor(preview.finalUrl || url), note: `No picture on ${host}, so we used a screenshot.` }
    throw new Error(`No picture found on ${host}. Paste a direct image link instead.`)
  } catch (error) {
    // Some sites block automated reading: fall back where we can.
    if (mode === 'logo') return { image: faviconFor(url), note: `Logo found for ${host}.` }
    if (mode === 'cover') return { image: screenshotFor(url), note: `Used a screenshot of ${host}.` }
    throw error
  }
}

/** A friendly label for a link: "GitHub", "LinkedIn", or the site name. */
export function labelFor(url: string): string {
  const host = hostOf(url)
  const known: Record<string, string> = {
    'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'linkedin.com': 'LinkedIn', 'behance.net': 'Behance', 'dribbble.com': 'Dribbble',
    'medium.com': 'Medium', 'x.com': 'X', 'twitter.com': 'X', 'youtube.com': 'YouTube', 'researchgate.net': 'ResearchGate',
    'scholar.google.com': 'Google Scholar', 'orcid.org': 'ORCID', 'kaggle.com': 'Kaggle',
  }
  return known[host] ?? host
}

/** Turns a page preview into a project ready for the editor. */
export function projectFromPreview(preview: LinkPreview, pastedUrl: string) {
  const url = preview.finalUrl || cleanUrl(pastedUrl)
  const host = hostOf(url)
  let title = preview.title
  let description = preview.description
  let subtitle = preview.siteName && preview.siteName.toLowerCase() !== title.toLowerCase() ? preview.siteName : ''
  // GitHub: "GitHub - owner/repo: description" → repo name + description.
  const gh = title.match(/^GitHub - [^/]+\/([^:]+)(?::\s*(.*))?$/)
  if (gh) {
    title = gh[1].replace(/[-_]+/g, ' ').trim()
    description = gh[2] || description.replace(/ Contribute to .* by creating an account on GitHub\.$/, '')
    subtitle = 'Open-source project'
  }
  title = title.replace(/\s*[|–—-]\s*[^|–—-]{1,40}$/, (m) => (m.toLowerCase().includes(host.split('.')[0]) ? '' : m)).trim() || host
  const isCode = /github\.com|gitlab\.com|bitbucket\.org/.test(host)
  return {
    title,
    subtitle,
    description,
    image: preview.image || (isCode ? '' : screenshotFor(url)),
    links: [{ label: isCode ? 'Source code' : 'Live site', url }],
  }
}

/** Fills in a link's label from its address when the label is still empty. */
export function autoLabel(link: { label: string; url: string }): { label: string; url: string } {
  if (link.label.trim() || !link.url.trim()) return link
  const url = cleanUrl(link.url)
  return url ? { label: labelFor(url), url } : link
}
