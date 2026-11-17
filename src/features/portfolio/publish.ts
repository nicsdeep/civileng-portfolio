import { isStreetAddress, slugify } from '../import/parse'
import { normalizeCv } from '../../content/normalize'
import type { Cv } from '../../content/types'
import { SaveError, fetchMyPortfolio, saveMyPortfolio, slugProblem, type PortfolioRow } from './api'

/*
 * One-step publishing: a résumé goes straight to a live portfolio.
 *   - new users get an address from their name (jane-doe, jane-doe-2, …);
 *   - returning users keep their address, and pictures, logos and links
 *     they added are carried over to the new résumé;
 *   - the previous version is remembered in this browser so the welcome
 *     banner can offer Undo.
 */

function slugBase(name: string): string {
  let base = slugify(name) || 'portfolio'
  if (base.length < 3) base = `${base}-portfolio`
  return base.slice(0, 34).replace(/-+$/, '')
}

/** Address candidates from a name: jane-doe, jane-doe-2 … jane-doe-9, then random. */
export function slugCandidates(name: string): string[] {
  const base = slugBase(name)
  const list = [base, ...Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`)]
  list.push(`${base}-${Math.random().toString(36).slice(2, 6)}`)
  return list.filter((s) => !slugProblem(s))
}

/**
 * True when an address was made automatically rather than chosen: it is one of
 * the name's candidates (jane-doe, jane-doe-2, jane-doe-x7k2), or it came from
 * a street address read as a name ("3453-caribou-crescent").
 */
export function isAutoAddress(slug: string, name: string): boolean {
  if (isStreetAddress(slug.replace(/-/g, ' '))) return true
  const base = slugBase(name)
  return slug === base || new RegExp(`^${base}-([2-9]|[a-z0-9]{4})$`).test(slug)
}

/**
 * Whether saving `newName` should move an automatic address to one made from
 * the new name. Old links keep working (the database remembers old addresses).
 */
export function addressFollowsName(slug: string | null, oldName: string, newName: string): boolean {
  if (!slug || !newName.trim() || !isAutoAddress(slug, oldName)) return false
  return !isAutoAddress(slug, newName) || isStreetAddress(slug.replace(/-/g, ' '))
}

/** Saves under the first free address. */
export async function saveWithFreeSlug(userId: string, cv: Cv, published: boolean, preferred?: string | null): Promise<PortfolioRow> {
  const candidates = preferred ? [preferred, ...slugCandidates(cv.name)] : slugCandidates(cv.name)
  for (const slug of candidates) {
    try {
      return await saveMyPortfolio(userId, cv, slug, published)
    } catch (error) {
      if (error instanceof SaveError && error.code === 'taken') continue
      throw error
    }
  }
  throw new SaveError('taken', 'Could not find a free address. Choose one in the editor.')
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase() && a.trim() !== ''

/** New résumé content, keeping the pictures and links the person already added. */
export function keepMedia(previous: Cv, next: Cv): Cv {
  const out = structuredClone(next)
  out.photo ||= previous.photo
  out.phone ||= previous.phone
  for (const e of out.experience) e.logo ||= previous.experience.find((p) => same(p.org, e.org))?.logo ?? ''
  for (const e of out.education) e.logo ||= previous.education.find((p) => same(p.school, e.school))?.logo ?? ''
  for (const p of out.projects) {
    const old = previous.projects.find((o) => same(o.title, p.title))
    if (!old) continue
    p.image ||= old.image
    if (p.links.length === 0) p.links = old.links
  }
  for (const c of out.certifications) c.url ||= previous.certifications.find((o) => same(o.name, c.name))?.url ?? ''
  const urls = new Set(out.links.map((l) => l.url))
  out.links.push(...previous.links.filter((l) => !urls.has(l.url)))
  return normalizeCv(out)
}

const PREVIOUS_KEY = 'pf-previous-version'

interface Previous {
  slug: string
  cv: Cv
}

export function rememberPrevious(slug: string, cv: Cv) {
  try {
    sessionStorage.setItem(PREVIOUS_KEY, JSON.stringify({ slug, cv }))
  } catch {
    // Undo is a convenience; without storage it is simply not offered.
  }
}

export function loadPrevious(slug: string): Cv | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(PREVIOUS_KEY) ?? 'null') as Previous | null
    return raw && raw.slug === slug ? normalizeCv(raw.cv) : null
  } catch {
    return null
  }
}

export function forgetPrevious() {
  try {
    sessionStorage.removeItem(PREVIOUS_KEY)
  } catch {
    // Nothing to forget.
  }
}

/** Publishes a résumé for this user. Returns the address and whether an older version was replaced. */
export async function publishResume(userId: string, cv: Cv): Promise<{ slug: string; replaced: boolean }> {
  const existing = await fetchMyPortfolio(userId)
  if (existing?.slug) {
    const previous = normalizeCv(existing.content)
    const merged = keepMedia(previous, cv)
    // An automatic address follows a changed name; a chosen one stays.
    const row = addressFollowsName(existing.slug, previous.name, merged.name)
      ? await saveWithFreeSlug(userId, merged, true)
      : await saveMyPortfolio(userId, merged, existing.slug, true)
    rememberPrevious(row.slug!, previous)
    return { slug: row.slug!, replaced: true }
  }
  const row = await saveWithFreeSlug(userId, cv, true)
  return { slug: row.slug!, replaced: false }
}
