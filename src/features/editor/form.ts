import type { Cv, Link } from '../../content/types'
import { normalizeCv } from '../../content/normalize'

/*
 * The editor works on a "form" copy of the CV where every list of strings is
 * plain text, one entry per line (entries such as “AWS (EC2, RDS, S3)” contain
 * commas), so typing behaves normally.
 * toForm / fromForm convert between the two; fromForm output is normalized.
 */

export type FieldKind = 'text' | 'textarea' | 'lines' | 'links' | 'checkbox'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  hint?: string
  /** Shown side by side with the next half-width field on wide screens. */
  half?: boolean
}

export type FormValue = string | boolean | Link[]
export type FormItem = Record<string, FormValue> & { _key: string }

export interface SectionDef {
  key: ListSection
  label: string
  itemLabel: string
  fields: FieldDef[]
  /** Short title for an item in the list. */
  title: (item: FormItem) => string
}

export type ListSection = 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'testimonials'

export const PROFILE_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Full name', kind: 'text', half: true },
  { key: 'headline', label: 'Headline', kind: 'text', half: true, hint: 'e.g. Full-stack & AI engineer' },
  { key: 'status', label: 'Status line', kind: 'text', hint: 'Shown above your name, e.g. “Final-year student · graduating November 2026”' },
  { key: 'location', label: 'Location', kind: 'text', half: true },
  { key: 'email', label: 'Public email', kind: 'text', half: true },
  { key: 'phone', label: 'Public phone (optional)', kind: 'text', hint: 'Leave empty to keep your number off the public site.' },
  { key: 'summary', label: 'Summary', kind: 'textarea' },
  { key: 'links', label: 'Profile links', kind: 'links', hint: 'GitHub, LinkedIn, live projects…' },
  { key: 'interests', label: 'Professional interests', kind: 'lines', hint: 'One per line.' },
]

export const SECTIONS: SectionDef[] = [
  {
    key: 'experience',
    label: 'Experience',
    itemLabel: 'role',
    title: (i) => [i.role, i.org].filter(Boolean).join(' · ') || 'New role',
    fields: [
      { key: 'role', label: 'Role', kind: 'text', half: true },
      { key: 'org', label: 'Organization', kind: 'text', half: true },
      { key: 'location', label: 'Location', kind: 'text' },
      { key: 'start', label: 'Start', kind: 'text', half: true, hint: 'e.g. 07/2022' },
      { key: 'end', label: 'End', kind: 'text', half: true, hint: 'Leave empty for “Present”' },
      { key: 'bullets', label: 'Highlights', kind: 'lines', hint: 'One per line.' },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    itemLabel: 'qualification',
    title: (i) => [i.degree, i.school].filter(Boolean).join(' · ') || 'New qualification',
    fields: [
      { key: 'degree', label: 'Degree or qualification', kind: 'text', half: true },
      { key: 'school', label: 'School', kind: 'text', half: true },
      { key: 'location', label: 'Location', kind: 'text', half: true },
      { key: 'dates', label: 'Dates', kind: 'text', half: true, hint: 'e.g. Expected November 2026' },
      { key: 'bullets', label: 'Activities & highlights', kind: 'lines', hint: 'One per line.' },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    itemLabel: 'project',
    title: (i) => String(i.title || 'New project'),
    fields: [
      { key: 'title', label: 'Title', kind: 'text', half: true },
      { key: 'subtitle', label: 'Subtitle', kind: 'text', half: true },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'tech', label: 'Technologies', kind: 'lines', hint: 'One per line.' },
      { key: 'links', label: 'Links', kind: 'links' },
      { key: 'featured', label: 'Feature on the home page', kind: 'checkbox' },
    ],
  },
  {
    key: 'skills',
    label: 'Skills',
    itemLabel: 'skill group',
    title: (i) => String(i.group || 'New skill group'),
    fields: [
      { key: 'group', label: 'Group name', kind: 'text' },
      { key: 'items', label: 'Skills', kind: 'lines', hint: 'One per line.' },
    ],
  },
  {
    key: 'certifications',
    label: 'Certifications',
    itemLabel: 'certification',
    title: (i) => String(i.name || 'New certification'),
    fields: [
      { key: 'name', label: 'Name', kind: 'text' },
      { key: 'issuer', label: 'Issuer', kind: 'text', half: true },
      { key: 'date', label: 'Date', kind: 'text', half: true },
    ],
  },
  {
    key: 'testimonials',
    label: 'Recommendations',
    itemLabel: 'recommendation',
    title: (i) => String(i.name || 'New recommendation'),
    fields: [
      { key: 'quote', label: 'Quote', kind: 'textarea' },
      { key: 'name', label: 'Name', kind: 'text', half: true },
      { key: 'title', label: 'Title and organization', kind: 'text', half: true },
    ],
  },
]

export interface CvForm {
  profile: Record<string, FormValue>
  lists: Record<ListSection, FormItem[]>
}

let counter = 0
export const newKey = () => `k${++counter}`

function toValue(kind: FieldKind, value: unknown): FormValue {
  switch (kind) {
    case 'lines':
      return Array.isArray(value) ? value.join('\n') : ''
    case 'links':
      return Array.isArray(value) ? (value as Link[]).map((l) => ({ ...l })) : []
    case 'checkbox':
      return value === true
    default:
      return typeof value === 'string' ? value : ''
  }
}

function fromValue(kind: FieldKind, value: FormValue | undefined): unknown {
  switch (kind) {
    case 'lines':
      return String(value ?? '').split('\n')
    default:
      return value
  }
}

export function blankItem(section: SectionDef): FormItem {
  const item: FormItem = { _key: newKey() }
  for (const f of section.fields) item[f.key] = toValue(f.kind, undefined)
  return item
}

export function toForm(cv: Cv): CvForm {
  const profile: Record<string, FormValue> = {}
  for (const f of PROFILE_FIELDS) profile[f.key] = toValue(f.kind, cv[f.key as keyof Cv])
  const lists = {} as CvForm['lists']
  for (const s of SECTIONS) {
    lists[s.key] = (cv[s.key] as unknown as Record<string, unknown>[]).map((raw) => {
      const item: FormItem = { _key: newKey() }
      for (const f of s.fields) item[f.key] = toValue(f.kind, raw[f.key])
      return item
    })
  }
  return { profile, lists }
}

export function fromForm(form: CvForm): Cv {
  const raw: Record<string, unknown> = {}
  for (const f of PROFILE_FIELDS) raw[f.key] = fromValue(f.kind, form.profile[f.key])
  for (const s of SECTIONS) {
    raw[s.key] = form.lists[s.key].map((item) => {
      const out: Record<string, unknown> = {}
      for (const f of s.fields) out[f.key] = fromValue(f.kind, item[f.key])
      return out
    })
  }
  return normalizeCv(raw)
}
