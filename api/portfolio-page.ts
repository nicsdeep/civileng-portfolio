// GET /p/:slug (via vercel.json) → the app page with the person's own title, preview tags and icon.
// Any problem falls back to the plain app page, which still loads the portfolio.
import { personFromContent, personalizeHtml } from './_lib/portfolio-head.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iealljnqewqyojtlgheh.supabase.co'
// Public (publishable) key: it only reads what Row Level Security lets anyone read.
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_KKkB6HH5NpGfqCFQw5ZQDA_R4ziATa1'

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 4000) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const slug = (url.searchParams.get('slug') || url.pathname.split('/')[2] || '').toLowerCase()
  // The built app page (a static file, served before any rewrite). One retry on a blip.
  const shellUrl = new URL('/index.html', url).toString()
  const shell = await fetchWithTimeout(shellUrl).catch(() => fetchWithTimeout(shellUrl))
  if (!shell.ok) return new Response('This page could not load. Refresh to try again.', { status: 503, headers: { 'retry-after': '5', 'cache-control': 'no-store' } })
  let html = await shell.text()
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400' }

  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 60) {
    try {
      const res = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/pf_profiles?select=content&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`,
        { headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` } },
      )
      const rows = res.ok ? ((await res.json()) as { content: unknown }[]) : []
      const person = personFromContent(rows[0]?.content)
      if (person) html = personalizeHtml(html, person, `${url.origin}/p/${slug}`)
      else if (res.ok && rows.length === 0) {
        // An old address: send link previews and visitors to where the portfolio lives now.
        const moved = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/rpc/pf_current_slug`, {
          method: 'POST',
          headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ old_slug: slug }),
        })
        const target = moved.ok ? ((await moved.json()) as unknown) : null
        if (typeof target === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(target)) {
          const section = (url.searchParams.get('section') || '').replace(/[^a-z/-]/g, '')
          return new Response(null, { status: 308, headers: { location: `/p/${target}${section ? `/${section}` : ''}`, 'cache-control': 'public, s-maxage=300' } })
        }
      }
    } catch {
      // Keep the plain page.
    }
  }
  return new Response(html, { status: 200, headers })
}
