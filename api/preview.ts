// GET /api/preview?url=https://example.com → title, description, image and logo of that page.
import { PreviewError, fetchPreview } from './_lib/preview.js'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url).searchParams.get('url') ?? ''
  try {
    if (!url || url.length > 2000) throw new PreviewError(400, 'Paste a web address.')
    const preview = await fetchPreview(url)
    return Response.json(preview, { headers: { 'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800' } })
  } catch (error) {
    const status = error instanceof PreviewError ? error.status : 500
    const message = error instanceof PreviewError ? error.message : 'That link could not be read right now. Try again later.'
    return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } })
  }
}
