// Puts one person's name, headline and photo into the page head of a shared portfolio,
// so link previews (WhatsApp, LinkedIn, Slack, iMessage…) show the person, not the platform.

export interface PersonHead {
  name: string
  headline?: string
  summary?: string
  photo?: string
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** Only plain https images are used in previews. */
function safeImage(url?: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** Reads the person from a stored portfolio (pf_profiles.content). Returns null if it has no name. */
export function personFromContent(content: unknown): PersonHead | null {
  if (!content || typeof content !== 'object') return null
  const c = content as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const name = str(c.name)
  if (!name) return null
  return { name, headline: str(c.headline), summary: str(c.summary), photo: str(c.photo) }
}

/** Returns the page with the platform's title, description, preview tags and icon replaced by the person's. */
export function personalizeHtml(html: string, person: PersonHead, pageUrl: string): string {
  const title = person.headline ? `${person.name} · ${person.headline}` : person.name
  const description = (person.summary || person.headline || `${person.name}'s portfolio`).slice(0, 200)
  const image = safeImage(person.photo)
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#072c58"/><text x="32" y="41" font-family="Georgia,serif" font-size="26" fill="#ffffff" text-anchor="middle">${initials(person.name)}</text></svg>`
  const iconUrl = `data:image/svg+xml,${encodeURIComponent(icon)}`

  const head = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${escape(pageUrl)}" />`,
    image ? `<meta property="og:image" content="${escape(image)}" />` : '',
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<link rel="icon" href="${iconUrl}" type="image/svg+xml" />`,
  ].filter(Boolean).join('\n    ')

  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="(icon|apple-touch-icon|manifest)"[^>]*>\s*/gi, '')
    .replace(/<\/head>/i, `    ${head}\n  </head>`)
}
