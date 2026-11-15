import type { Certification, Cv, Education, Experience, Link, Project, SkillGroup, Testimonial } from './types'

/*
 * Turns stored JSON (or the editor's working copy) into a clean Cv:
 * unknown keys are dropped, wrong types become empty values, text is
 * trimmed and length-limited, and empty list entries are removed.
 * The public pages only ever render normalized data.
 */

const MAX_TEXT = 300
const MAX_LONG = 4000
const MAX_ITEMS = 60

type Raw = Record<string, unknown>

function obj(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {}
}

function text(value: unknown, max = MAX_TEXT): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function list<T>(value: unknown, map: (item: unknown) => T, keep: (item: T) => boolean): T[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_ITEMS).map(map).filter(keep)
}

function strings(value: unknown, max = MAX_TEXT): string[] {
  return list(value, (item) => text(item, max), Boolean)
}

/** Only web and email links may be rendered; anything else (e.g. javascript:) is dropped. */
export function safeUrl(value: unknown): string {
  const raw = text(value, 2000)
  if (!raw) return ''
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(raw)) return raw
  try {
    const { protocol } = new URL(raw)
    return protocol === 'https:' || protocol === 'http:' ? raw : ''
  } catch {
    return ''
  }
}

/** Pictures must come from a secure web address. */
export function imageUrl(value: unknown): string {
  const url = safeUrl(value)
  return url.startsWith('https://') ? url : ''
}

function link(value: unknown): Link {
  const raw = obj(value)
  return { label: text(raw.label), url: safeUrl(raw.url) }
}
const hasUrl = (l: Link) => l.url !== ''

function links(value: unknown): Link[] {
  return list(value, link, hasUrl).map((l) => ({ ...l, label: l.label || l.url }))
}

function skillGroup(value: unknown): SkillGroup {
  const raw = obj(value)
  return { group: text(raw.group), items: strings(raw.items) }
}

function experience(value: unknown): Experience {
  const raw = obj(value)
  return {
    role: text(raw.role),
    org: text(raw.org),
    logo: imageUrl(raw.logo),
    location: text(raw.location),
    start: text(raw.start),
    end: text(raw.end),
    bullets: strings(raw.bullets, MAX_LONG),
  }
}

function education(value: unknown): Education {
  const raw = obj(value)
  return {
    degree: text(raw.degree),
    school: text(raw.school),
    logo: imageUrl(raw.logo),
    location: text(raw.location),
    dates: text(raw.dates),
    bullets: strings(raw.bullets, MAX_LONG),
  }
}

function project(value: unknown): Project {
  const raw = obj(value)
  return {
    title: text(raw.title),
    subtitle: text(raw.subtitle),
    description: text(raw.description, MAX_LONG),
    image: imageUrl(raw.image),
    tech: strings(raw.tech),
    links: links(raw.links),
    featured: raw.featured === true,
  }
}

function certification(value: unknown): Certification {
  const raw = obj(value)
  return { name: text(raw.name), issuer: text(raw.issuer), date: text(raw.date), url: safeUrl(raw.url).startsWith('http') ? safeUrl(raw.url) : '' }
}

function testimonial(value: unknown): Testimonial {
  const raw = obj(value)
  return { quote: text(raw.quote, MAX_LONG), name: text(raw.name), title: text(raw.title) }
}

export function normalizeCv(value: unknown): Cv {
  const raw = obj(value)
  const email = text(raw.email)
  return {
    name: text(raw.name),
    photo: imageUrl(raw.photo),
    headline: text(raw.headline),
    location: text(raw.location),
    status: text(raw.status),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
    phone: text(raw.phone, 40),
    summary: text(raw.summary, MAX_LONG),
    links: links(raw.links),
    skills: list(raw.skills, skillGroup, (s) => s.items.length > 0),
    experience: list(raw.experience, experience, (e) => e.role !== '' || e.org !== ''),
    education: list(raw.education, education, (e) => e.degree !== '' || e.school !== ''),
    projects: list(raw.projects, project, (p) => p.title !== ''),
    certifications: list(raw.certifications, certification, (c) => c.name !== ''),
    interests: strings(raw.interests),
    testimonials: list(raw.testimonials, testimonial, (t) => t.quote !== ''),
  }
}

/** "07/2022 – Present", "March 2026 – May 2026", or a single date. */
export function dateRange(start: string, end: string): string {
  if (!start) return end
  return `${start} – ${end || 'Present'}`
}
