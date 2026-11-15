import { emptyCv } from '../../content/cv'
import { normalizeCv } from '../../content/normalize'
import type { Cv } from '../../content/types'
import { cleanUrl, fetchLinkPreview, type LinkPreview } from '../links/preview'

/*
 * LinkedIn profile links (docs/PRD.md § LinkedIn).
 * LinkedIn shares only a public summary with other sites: name, headline,
 * current company, education, location and photo. The full profile comes
 * from LinkedIn's own "Save to PDF" file, which the résumé reader handles.
 */

export function isLinkedInProfile(input: string): boolean {
  return /(^|\/\/|\.)linkedin\.com\/in\/[^/?#\s]+/i.test(input.trim())
}

/** "linkedin.com/in/jane-wanjiru-doe-1a2b3c" → "Jane Wanjiru Doe". */
export function nameFromProfileUrl(url: string): string {
  const slug = url.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1] ?? ''
  const words = decodeURIComponent(slug)
    .split(/[-_]+/)
    .filter((w) => /^\p{L}+$/u.test(w))
  return words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

/** Reads LinkedIn's public summary: "Headline · Experience: X · Education: Y · Location: Z · …". */
export function cvFromLinkedIn(preview: Pick<LinkPreview, 'title' | 'description' | 'image'> | null, url: string): Cv {
  const cv: Cv = structuredClone(emptyCv)
  const profileUrl = cleanUrl(url).replace(/[?#].*$/, '')
  cv.links = [{ label: 'LinkedIn', url: profileUrl }]
  const [titleName, ...titleRest] = (preview?.title ?? '').replace(/\s*\|\s*LinkedIn\s*$/i, '').split(/\s+[-–]\s+/)
  cv.name = titleName?.trim() || nameFromProfileUrl(profileUrl)
  if (preview?.image && !/static\.licdn\.com|ghost|default/i.test(preview.image)) cv.photo = preview.image

  const parts = (preview?.description ?? '').split(/\s+·\s+/)
  const field = (label: string) => parts.find((p) => p.toLowerCase().startsWith(`${label.toLowerCase()}:`))?.replace(/^[^:]+:\s*/, '').trim() ?? ''
  const headline = parts[0] && !/^(experience|education|location):/i.test(parts[0]) && !/connections on linkedin/i.test(parts[0]) ? parts[0].replace(/…$/, '').trim() : ''
  const company = field('Experience') || titleRest.join(' – ')
  const school = field('Education')
  cv.location = field('Location')
  cv.headline = (headline.split(/(?<=\.)\s|\s\|\s/)[0] || company).replace(/\.$/, '').slice(0, 120)
  if (headline && headline.length > cv.headline.length) cv.summary = headline
  if (company) cv.experience = [{ role: cv.headline && cv.headline !== company ? cv.headline : 'Current role', org: company, logo: '', location: '', start: '', end: '', bullets: [] }]
  if (school) cv.education = [{ degree: '', school, logo: '', location: '', dates: '', bullets: [] }]
  return normalizeCv(cv)
}

/** Reads a LinkedIn profile link. If LinkedIn refuses, the name still comes from the address. */
export async function readLinkedIn(url: string): Promise<{ cv: Cv; complete: boolean }> {
  try {
    const preview = await fetchLinkPreview(cleanUrl(url))
    return { cv: cvFromLinkedIn(preview, url), complete: true }
  } catch {
    return { cv: cvFromLinkedIn(null, url), complete: false }
  }
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Combines a résumé with a LinkedIn summary without contradictions: the
 * résumé wins wherever it has something; LinkedIn only fills what is
 * missing (photo, headline, location, summary, roles and schools not listed).
 */
export function mergeProfiles(resume: Cv, linkedIn: Cv): Cv {
  const out = structuredClone(resume)
  for (const key of ['name', 'photo', 'headline', 'location', 'summary'] as const) out[key] ||= linkedIn[key]
  for (const e of linkedIn.experience) if (!out.experience.some((r) => same(r.org, e.org))) out.experience.push(e)
  for (const e of linkedIn.education) if (!out.education.some((r) => same(r.school, e.school))) out.education.push(e)
  const urls = new Set(out.links.map((l) => l.url.replace(/\/$/, '').toLowerCase()))
  for (const l of linkedIn.links) if (!urls.has(l.url.replace(/\/$/, '').toLowerCase())) out.links.unshift(l)
  return normalizeCv(out)
}
