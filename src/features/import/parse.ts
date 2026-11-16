import { emptyCv } from '../../content/cv'
import { isTechnicalLink, normalizeCv } from '../../content/normalize'
import type { Certification, Cv, Education, Experience, Link, Project, SkillGroup, Testimonial } from '../../content/types'

/*
 * Rule-based résumé reader (no AI). Works on plain text lines from
 * extract.ts or pasted text:
 *   1. contact details anywhere (email, links), name and header from the top;
 *   2. split into sections by common heading names;
 *   3. read each section with simple, predictable rules.
 * The result is a starting point the user reviews in the editor.
 */

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'interests'
  | 'testimonials'
  | 'links'
  | 'languages'
  | 'ignore'

const HEADINGS: Record<SectionKey, string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'about', 'about me', 'objective', 'career objective', 'personal statement', 'overview', 'career summary'],
  experience: [
    'experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history',
    'career history', 'relevant experience', 'engineering experience', 'internships', 'internship', 'volunteer experience',
    'volunteering', 'leadership experience', 'experience and leadership',
  ],
  education: ['education', 'academic background', 'academic qualifications', 'qualifications', 'education and training', 'academics'],
  skills: [
    'top skills',
    'skills', 'key skills', 'technical skills', 'core skills', 'core competencies', 'competencies', 'skills and abilities',
    'areas of expertise', 'expertise', 'software', 'tools', 'technologies', 'software skills', 'skills summary',
  ],
  projects: ['projects', 'key projects', 'selected projects', 'academic projects', 'personal projects', 'project experience', 'portfolio', 'research', 'research projects', 'publications'],
  certifications: [
    'honors awards', 'honorsawards',
    'certifications', 'certificates', 'certification', 'licenses', 'licences', 'licenses and certifications',
    'licences and certifications', 'certifications and licenses', 'certifications and licences', 'awards', 'honors', 'honours',
    'awards and honors', 'awards and honours', 'achievements', 'accomplishments', 'professional development', 'training', 'courses',
  ],
  interests: ['interests', 'professional interests', 'hobbies', 'hobbies and interests', 'activities'],
  testimonials: ['recommendation', 'recommendations', 'testimonials', 'testimonial', 'endorsements'],
  links: ['links', 'websites', 'online profiles', 'profiles', 'websites portfolios profiles', 'social', 'online presence'],
  languages: ['languages', 'language skills'],
  ignore: ['references', 'referees', 'contact', 'contact details', 'contact information', 'personal details', 'personal information', 'declaration'],
}

const HEADING_INDEX = new Map<string, SectionKey>()
for (const [key, names] of Object.entries(HEADINGS) as [SectionKey, string[]][]) {
  for (const name of names) HEADING_INDEX.set(name.replace(/[^a-z]/g, ''), key)
}

/** The section a line names, if it is a heading ("WORK EXPERIENCE", "Skills:", "Recommendati on"). */
export function sectionFor(line: string): SectionKey | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 48 || /[@/]|https?:/i.test(trimmed)) return null
  const key = trimmed.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '')
  return HEADING_INDEX.get(key) ?? null
}

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

const BULLET_RE = /^\s*(?:[•▪●◦‣∙·*✓✔➢►>-]|\d{1,2}[.)])\s+/
const isBullet = (line: string) => BULLET_RE.test(line)
const stripBullet = (line: string) => line.replace(BULLET_RE, '').trim()
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s|,;)]+|\b(?:github\.com|gitlab\.com|linkedin\.com|behance\.net|dribbble\.com|medium\.com)\/[^\s|,;)]+/gi
const URL_TEST = new RegExp(URL_RE.source, 'i')
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const DATE = `(?:${MONTH}\\.?\\s+\\d{1,2},?\\s+\\d{4}|${MONTH}\\.?\\s+\\d{4}|${MONTH}\\.?\\s+\\d{1,2}|${MONTH}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\d{1,2}\\/\\d{4}|(?:19|20)\\d{2})`
const END = `(?:${DATE}|present|current|now|ongoing|to date|date)`
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${END})`, 'i')
const SINGLE_DATE_RE = new RegExp(`(?:expected\\s+(?:graduation\\s+)?(?:in\\s+)?|graduat(?:ed|ing|ion)\\s+(?:in\\s+)?|since\\s+)?(${DATE})(?![\\w/])`, 'i')

function titleCase(text: string): string {
  return text.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/^[\s|,;:–—-]+|[\s|,;–—-]+$/g, '')
    .trim()
}

/** Splits on commas that are not inside brackets: "AWS (EC2, S3), Docker" → 2 items. */
function splitList(text: string, separators = /[,;]/): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
    if (depth === 0 && separators.test(ch)) {
      out.push(current)
      current = ''
    } else current += ch
  }
  out.push(current)
  return out.map(tidy).filter(Boolean)
}

/** Finds a date range or single date and returns it with the rest of the text. */
export function takeDates(text: string): { start: string; end: string; rest: string; found: boolean } {
  const range = text.match(RANGE_RE)
  if (range) {
    const end = /present|current|now|ongoing|date/i.test(range[2]) ? '' : tidy(range[2])
    return { start: tidy(range[1]), end, rest: tidy(text.replace(range[0], ' ')), found: true }
  }
  const single = text.match(SINGLE_DATE_RE)
  if (single && single.index !== undefined) {
    const label = /expected/i.test(single[0]) ? `Expected ${single[1]}` : single[1]
    return { start: tidy(label), end: '', rest: tidy(text.replace(single[0], ' ')), found: true }
  }
  return { start: '', end: '', rest: text, found: false }
}

function labelForUrl(url: string, before = ''): string {
  // The label is the short phrase right before a colon, within the same sentence.
  const hint = before.match(/([^.:;!?|•\n]{1,40}):\s*$/)
  if (hint && /[A-Za-z]/.test(hint[1]) && tidy(hint[1]).split(' ').length <= 6) {
    const word = tidy(hint[1]).slice(0, 40)
    if (/^(live )?demo$/i.test(word)) return 'Live demo'
    if (/^(github|source|code|repo)/i.test(word)) return /github/i.test(url) && !/\/[^/]+\/[^/]+/.test(url.replace(/^https?:\/\//, '').replace(/^github\.com/, '')) ? 'GitHub' : 'Source'
    if (/api/i.test(word)) return 'API'
    return word
  }
  const host = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  if (/github\.com/.test(host)) return 'GitHub'
  if (/linkedin\.com/.test(host)) return 'LinkedIn'
  if (/gitlab\.com/.test(host)) return 'GitLab'
  if (/behance\.net/.test(host)) return 'Behance'
  return host
}

function normalizeUrl(raw: string): string {
  const url = raw.replace(/[.,;:]+$/, '')
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/** All links in a block of text, labelled from the words just before them. */
function findLinks(text: string): Link[] {
  const links: Link[] = []
  for (const match of text.matchAll(URL_RE)) {
    if (EMAIL_RE.test(match[0])) continue
    const before = text.slice(Math.max(0, (match.index ?? 0) - 60), match.index).split(/[|•\n]/).pop() ?? ''
    const link = { label: labelForUrl(match[0], before), url: normalizeUrl(match[0]) }
    if (!isTechnicalLink(link)) links.push(link)
  }
  return links
}

function removeLinks(text: string): string {
  return tidy(
    text
      .replace(URL_RE, ' ')
      .replace(/\b[A-Za-z][\w ()/&-]{0,30}:\s*(?=\||$)/g, ' ')
      .replace(/(\|\s*)+/g, '| ')
      .replace(/\|\s*$/, ''),
  )
}

function joinParagraph(lines: string[]): string {
  return tidy(lines.map(stripBullet).join(' ').replace(/(\w)- (\w)/g, '$1-$2'))
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item).toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Joins wrapped lines back into their bullet (for pasted text without layout information). */
function mergeContinuations(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const prev = out[out.length - 1]
    const continues =
      prev !== undefined &&
      prev !== '' &&
      line !== '' &&
      isBullet(prev) &&
      !isBullet(line) &&
      !sectionFor(line.replace(/:$/, '')) &&
      !/[.!?:]$/.test(prev) &&
      !takeDates(line).found &&
      (/^[a-z(]/.test(line) || line.split(/\s+/).length <= 3)
    if (continues) out[out.length - 1] = `${prev} ${line}`
    else out.push(line)
  }
  return out
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

interface Block {
  key: SectionKey | null
  title: string
  lines: string[]
}

function splitSections(lines: string[]): Block[] {
  const blocks: Block[] = [{ key: null, title: '', lines: [] }]
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = sectionFor(line.replace(/:$/, ''))
    if (key) {
      blocks.push({ key, title: line.replace(/:$/, ''), lines: [] })
      continue
    }
    // "Key Skills  • Python" or "Skills: Python, SQL": heading and content on one line.
    const inline = line.match(/^([A-Za-z][A-Za-z &,]{2,40}?)(?::\s+|\s{2,}|\s+(?=[•▪●]))(.+)$/)
    const inlineKey = inline ? sectionFor(inline[1]) : null
    if (inline && inlineKey) {
      blocks.push({ key: inlineKey, title: inline[1], lines: [inline[2].trim()] })
      continue
    }
    blocks[blocks.length - 1].lines.push(line)
  }
  return blocks
}

/** Splits a section into entries: a header (1–3 plain lines) followed by bullets. */
function entries(lines: string[]): { header: string[]; bullets: string[] }[] {
  const out: { header: string[]; bullets: string[] }[] = []
  let current: { header: string[]; bullets: string[] } | null = null
  let blank = false
  for (const line of lines) {
    if (!line) {
      blank = true
      continue
    }
    if (isBullet(line)) {
      if (!current) out.push((current = { header: [], bullets: [] }))
      current.bullets.push(stripBullet(line))
    } else {
      // A second dated line only starts a new entry once the header is complete
      // ("Role  2020 – 2022" / "Company | City | 2020 – 2022" is still one entry).
      const startsNew = !current || current.bullets.length > 0 || blank || (current.header.length >= 2 && takeDates(line).found && current.header.some((h) => takeDates(h).found))
      if (startsNew) out.push((current = { header: [line], bullets: [] }))
      else current!.header.push(line)
    }
    blank = false
  }
  return out.filter((e) => e.header.length || e.bullets.length)
}

const LOCATION_HINT = /\b(remote|hybrid|on-?site)\b|,\s*[A-Z][a-z]|\b(?:county|province|state|city)\b/

function parseRoleHeader(header: string[]): { title: string; org: string; location: string; start: string; end: string; extra: string[] } {
  let start = ''
  let end = ''
  const parts: string[] = []
  for (const raw of header) {
    let line = raw
    // Keep looking for a date until one is found; then strip later duplicates.
    const dates = takeDates(line)
    if (dates.found) {
      if (!start && !end) {
        start = dates.start
        end = dates.end
      }
      line = dates.rest
    }
    line = line.replace(/\|\s*(?:19|20)\d{2}\s*$/, '').replace(/^\((?:active|current|ongoing)\)$/i, '')
    if (/:$/.test(line.trim())) continue // "Activities & Involvement:"
    if (tidy(line)) parts.push(tidy(line))
  }
  let title = parts[0] ?? ''
  let org = ''
  let location = ''
  const extra: string[] = []
  const rest = parts.slice(1)

  // "Role | Company | City" or "Role at Company" on one line.
  if (!rest.length) {
    let pieces = title.split(/\s+\|\s+|\s+at\s+|\s+@\s+/)
    // "BASc Civil Engineering, University of Testing": one comma between two names.
    if (pieces.length === 1 && (title.match(/,/g) ?? []).length === 1) pieces = splitList(title, /,/)
    if (pieces.length > 1) {
      title = pieces[0]
      rest.push(pieces.slice(1).join(' | '))
    }
  }
  if (rest.length) {
    const pieces = rest[0].split(/\s*\|\s*/).map(tidy).filter(Boolean)
    org = pieces[0] ?? ''
    location = pieces.slice(1).find((p) => LOCATION_HINT.test(p) || /^[A-Z][\w .'-]+$/.test(p)) ?? ''
    if (!location && pieces.length === 1 && /,/.test(org)) {
      // "Acme Ltd, Nairobi, Kenya"
      const [first, ...others] = splitList(org, /,/)
      if (others.length && others.every((o) => o.split(' ').length <= 3)) {
        org = first
        location = others.join(', ')
      }
    }
    extra.push(...rest.slice(1))
  }
  return { title, org, location, start, end, extra }
}

// LinkedIn lists "Company / Role / January 2020 - Present (4 years 11 months) / Place / text".
const DURATION_RE = /\(\s*(?:less than a year|\d+\s+(?:years?|yrs?|months?|mos?)(?:\s+\d+\s+(?:months?|mos?))?)\s*\)/i
const DURATION_ONLY_RE = /^(?:\d+\s+(?:years?|yrs?)\s*)?(?:\d+\s+(?:months?|mos?))?$/i
const isLinkedInDate = (line: string) => DURATION_RE.test(line) && takeDates(line.replace(DURATION_RE, '')).found

function parseLinkedInExperience(lines: string[]): Experience[] {
  const list = lines.filter(Boolean).map(stripBullet)
  const dates = list.map((l, i) => (isLinkedInDate(l) ? i : -1)).filter((i) => i >= 0)
  const out: Experience[] = []
  let company = ''
  dates.forEach((d, k) => {
    const prev = k > 0 ? dates[k - 1] : -1
    const role = list[d - 1] ?? ''
    // A new company line sits two lines above the date, unless roles share one company.
    let c = d - 2
    if (c >= 0 && DURATION_ONLY_RE.test(list[c]) && list[c]) c--
    if (c > prev + 1 || (k === 0 && c >= 0)) company = list[c]
    const end = k + 1 < dates.length ? dates[k + 1] - 2 : list.length
    const body = list.slice(d + 1, Math.max(d + 1, end)).filter((l) => !DURATION_ONLY_RE.test(l))
    let location = ''
    if (body[0] && body[0].split(/\s+/).length <= 6 && !/[.!?]$/.test(body[0]) && (/,/.test(body[0]) || LOCATION_HINT.test(body[0]))) location = body.shift()!
    const { start, end: finish } = takeDates(list[d].replace(DURATION_RE, ''))
    out.push({ role: tidy(role), org: tidy(company), logo: '', location, start, end: finish, bullets: paragraphs(body) })
  })
  return out
}

/** Joins wrapped lines into paragraphs; lines that start with a bullet stay separate. */
function paragraphs(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    if (out.length && !isBullet(line) && !/[.!?:]$/.test(out[out.length - 1])) out[out.length - 1] += ` ${line}`
    else out.push(stripBullet(line))
  }
  return out.map(tidy).filter(Boolean)
}

function parseExperience(lines: string[]): Experience[] {
  if (lines.some(isLinkedInDate)) return parseLinkedInExperience(lines)
  return entries(lines).map((e) => {
    const h = parseRoleHeader(e.header)
    return { role: h.title, org: h.org, logo: '', location: h.location, start: h.start, end: h.end, bullets: [...h.extra, ...e.bullets] }
  })
}

const INSTITUTION_RE = /\b(university|college|institute|school|polytechnic|academy|universit[éy]|TVET|seminary)\b/i

function parseEducation(lines: string[]): Education[] {
  return entries(lines).map((e) => {
    // "University of X" first, then "Degree, Field · (2016 - 2020)" (LinkedIn and many CVs).
    const secondHasText = e.header.length >= 2 && /\p{L}{3,}/u.test(takeDates(e.header[1]).rest)
    if (secondHasText && INSTITUTION_RE.test(e.header[0]) && !INSTITUTION_RE.test(e.header[1]) && !e.header[0].includes(',')) {
      const dates = takeDates(e.header.slice(1).join(' '))
      const degree = tidy(dates.rest.replace(/[·•]\s*\(\s*\)|\(\s*\)|[·•]\s*$/g, ''))
      return { degree, school: tidy(e.header[0]), logo: '', location: '', dates: dates.end ? `${dates.start} – ${dates.end}` : dates.start, bullets: e.bullets }
    }
    const h = parseRoleHeader(e.header)
    let degree = tidy(h.title.replace(/\bexpected(?:\s+graduation)?\b/i, ''))
    let school = h.org
    if (INSTITUTION_RE.test(degree) && school && !INSTITUTION_RE.test(school)) [degree, school] = [school, degree]
    const dates = h.end ? `${h.start} – ${h.end}` : h.start
    return { degree, school, logo: '', location: h.location, dates, bullets: [...h.extra, ...e.bullets] }
  })
}

function parseSkills(lines: string[], groupTitle = 'Skills'): SkillGroup[] {
  const groups: SkillGroup[] = []
  const loose: string[] = []
  for (const line of lines) {
    if (!line) continue
    const pieces = line.split(/\s*[•▪●◦‣∙·]\s*|\s{2,}/).map(stripBullet).filter(Boolean)
    for (const piece of pieces) {
      const named = piece.match(/^([A-Za-z][\w &/+-]{1,40}):\s*(.+)$/)
      if (named) groups.push({ group: tidy(named[1]), items: splitList(named[2]) })
      else if (/[,;]/.test(piece) && !/^[^(]*\([^)]*[,;][^)]*\)[^(,;]*$/.test(piece)) loose.push(...splitList(piece))
      else loose.push(tidy(piece))
    }
  }
  const cleaned = uniqueBy(loose.filter((s) => s.length <= 80), (s) => s)
  if (cleaned.length) groups.unshift({ group: groupTitle, items: cleaned })
  return groups
}

function parseProjects(lines: string[], knownSkills: string[]): Project[] {
  const projects: { title: string; body: string[] }[] = []
  // Wrapped paragraph lines are close to the longest line; titles are clearly shorter.
  const longest = Math.max(0, ...lines.map((l) => l.length))
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const prev = lines[i - 1]
    const startsAfterBreak = prev === undefined || prev === '' || /[.!?)]$/.test(prev) || isBullet(prev) || URL_TEST.test(prev)
    const looksLikeTitle =
      !isBullet(line) &&
      !URL_TEST.test(line) &&
      line.length <= 90 &&
      (longest < 60 || line.length < longest * 0.75) &&
      !/[.!?]$/.test(line) &&
      line.split(/\s+/).length <= 14 &&
      startsAfterBreak &&
      i + 1 < lines.length
    if (looksLikeTitle || projects.length === 0) projects.push({ title: looksLikeTitle ? line : '', body: looksLikeTitle ? [] : [line] })
    else projects[projects.length - 1].body.push(line)
  }
  const skillPatterns = knownSkills
    .map((s) => s.replace(/\s*\(.*\)$/, '').trim())
    .filter((s) => s.length >= 2)
    .map((s) => ({ name: s, re: new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w]|$)`, 'i') }))

  return projects.map((p) => {
    const text = p.body.join('\n')
    const links = findLinks(text)
    const { title, subtitle } = splitTitle(p.title || 'Project')
    const description = removeLinks(joinParagraph(p.body))
    const tech = uniqueBy(skillPatterns.filter((s) => s.re.test(description)).map((s) => s.name), (s) => s).slice(0, 8)
    return { title, subtitle, description, image: '', tech, links, featured: false }
  })
}

/** "MedMatch AI – Healthcare matching platform" → title + subtitle. */
function splitTitle(text: string): { title: string; subtitle: string } {
  const parts = text.split(/\s+[–—|:]\s+|\s+-\s+/)
  if (parts.length > 1 && parts[0].length >= 4 && parts[0].split(' ').length <= 6) {
    return { title: tidy(parts[0]), subtitle: tidy(parts.slice(1).join(' – ')) }
  }
  return { title: tidy(text), subtitle: '' }
}

function parseCertifications(lines: string[]): Certification[] {
  return mergeContinuations(lines)
    .filter(Boolean)
    .map((line) => {
      const text = stripBullet(line)
      const dates = takeDates(text.replace(/,\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/, (m) => m.replace(/^,\s*/, ' ')))
      const body = dates.found ? dates.rest : text
      const [name, ...rest] = body.split(/\s+[–—]\s+|\s+-\s+/)
      const issuer = tidy(splitList(rest.join(' – '), /,/)[0] ?? '')
      return { name: tidy(name), issuer, date: dates.found ? dates.start : '', url: '' }
    })
}

function parseList(lines: string[]): string[] {
  return uniqueBy(
    lines.flatMap((l) => (isBullet(l) ? [stripBullet(l)] : l.split(/\s*[•▪●]\s*/))).map(tidy).filter((l) => l && l.length <= 120),
    (s) => s,
  )
}

function parseTestimonials(lines: string[]): Testimonial[] {
  const text = lines.filter(Boolean)
  if (!text.length) return []
  // The last short line is usually "Name, Title – Company".
  let attribution = ''
  if (text.length > 1 && text[text.length - 1].length <= 120 && !/[.!?]["”]?$/.test(text[text.length - 1])) attribution = text.pop()!
  const quote = joinParagraph(text).replace(/^["“]|["”]$/g, '')
  if (quote.length < 40) return []
  const [name, ...title] = attribution.split(/\s*,\s*|\s+[–—-]\s+/)
  return [{ quote, name: tidy(name ?? ''), title: tidy(title.join(', ')) }]
}

/** First thing that looks like a phone number (7–15 digits), not a date range like "2016 - 2020". */
export function findPhone(text: string): string {
  for (const match of text.matchAll(new RegExp(PHONE_RE.source, 'g'))) {
    const candidate = tidy(match[0])
    const digits = candidate.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) continue
    if (/^(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}$/.test(candidate)) continue
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(candidate)) continue
    return candidate.slice(0, 40)
  }
  return ''
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface ParseResult {
  cv: Cv
  /** Headings that were found but are not part of a portfolio (e.g. "References"). */
  skipped: string[]
  /** Phone number found in the résumé. Kept in the private upload history, never on the public portfolio. */
  phone: string
}

const STREET_RE = /\b(street|st|road|rd|avenue|ave|crescent|cres|drive|dr|lane|ln|boulevard|blvd|court|ct|way|place|pl|close|terrace|highway|hwy|apt|suite|unit)\b\.?/i

/** "3453 Caribou Crescent", "Apt 4, 12 Main St", "P.O. Box 123": never a name or a headline. */
export function isStreetAddress(line: string): boolean {
  const l = line.trim()
  if (/^p\.?\s*o\.?\s*box\b/i.test(l)) return true
  // A house number, then a street word ("1200 Bay St", "45B Ngong Road"). Postcodes such as
  // "00100, Nairobi" and headlines such as "5 years in design" are not addresses.
  return /^\d+[a-z]?\s+\p{L}/iu.test(l) && STREET_RE.test(l)
}

export function parseResume(text: string): ParseResult {
  const lines = mergeContinuations(
    text
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((l) => l.replace(/[ \t]+$/g, '').replace(/^\s+/, '').replace(/\s{3,}/g, '  '))
      // Hidden tracking codes some résumé builders add, e.g. "#HRJ#6fe7…#".
      .filter((l) => !/^#[A-Z]{2,}#/.test(l))
      // Page footers such as LinkedIn's "Page 1 of 3".
      .filter((l) => !/^page \d+ of \d+$/i.test(l)),
  )
  const blocks = splitSections(lines)
  const header = blocks[0].lines.filter(Boolean)
  const cv: Cv = structuredClone(emptyCv)
  const skipped: string[] = []

  // Contact details from the whole text, links from the header and link sections.
  cv.email = text.match(EMAIL_RE)?.[0] ?? ''
  const phone = findPhone(text)
  const headerText = header.join('\n')
  const links: Link[] = findLinks(headerText)

  // Name: first header line that is not contact details or a street address.
  const nameIndex = header.findIndex((l) => !EMAIL_RE.test(l) && !URL_TEST.test(l) && !PHONE_RE.test(l) && !isStreetAddress(l) && /\p{L}/u.test(l) && l.split(/\s+/).length <= 6)
  if (nameIndex >= 0) {
    const name = tidy(header[nameIndex].replace(/[|,].*$/, ''))
    cv.name = name === name.toUpperCase() ? titleCase(name) : name
  }

  // Remaining header pieces: location, status and headline.
  const pieces = header
    .filter((_, i) => i !== nameIndex)
    .flatMap((l) => l.split(/\s*[|•·]\s*|\s{2,}/))
    .map(tidy)
    .filter((p) => p && !EMAIL_RE.test(p) && !PHONE_RE.test(p) && !URL_TEST.test(p) && !/^\+?\d[\d\s-]*$/.test(p) && !isStreetAddress(p))
  for (const piece of pieces) {
    const withoutPostcode = tidy(piece.replace(/^\d{3,6}\s*,?\s*/, ''))
    if (!cv.location && /^[\p{L} .'-]+,\s*[\p{L} .'-]+$/u.test(withoutPostcode) && withoutPostcode.split(/\s+/).length <= 6) cv.location = withoutPostcode
    else if (!cv.status && /\b(year|student|graduat|available|open to|seeking|looking)\b/i.test(piece)) cv.status = piece
    else if (!cv.headline && piece.length <= 70 && /\p{L}/u.test(piece)) cv.headline = piece
  }

  const skillLines: string[] = []
  const projectLines: string[][] = []
  for (const block of blocks.slice(1)) {
    const body = block.lines
    switch (block.key) {
      case 'summary':
        cv.summary = cv.summary ? `${cv.summary} ${joinParagraph(body.filter(Boolean))}` : joinParagraph(body.filter(Boolean))
        break
      case 'experience':
        cv.experience.push(...parseExperience(body))
        break
      case 'education':
        cv.education.push(...parseEducation(body))
        break
      case 'skills':
        skillLines.push(...body)
        break
      case 'languages':
        cv.skills.push(...parseSkills(body, 'Languages'))
        break
      case 'projects':
        projectLines.push(body)
        break
      case 'certifications':
        cv.certifications.push(...parseCertifications(body))
        break
      case 'interests':
        cv.interests.push(...parseList(body))
        break
      case 'testimonials':
        cv.testimonials.push(...parseTestimonials(body))
        break
      case 'links':
        links.push(...findLinks(body.join('\n')))
        break
      default:
        if (block.title) skipped.push(block.title)
    }
  }
  cv.skills.unshift(...parseSkills(skillLines))
  const allSkills = cv.skills.flatMap((s) => s.items)
  for (const body of projectLines) cv.projects.push(...parseProjects(body, allSkills))
  cv.projects.forEach((p, i) => (p.featured = i < 3))
  cv.links = uniqueBy(links, (l) => l.url.replace(/\/$/, ''))

  if (!cv.headline && cv.experience[0]?.role) cv.headline = cv.experience[0].role
  return { cv: normalizeCv(cv), skipped, phone }
}

/** "Jane Wanjiru Doe" → "jane-wanjiru-doe" (also used to suggest a public address). */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}
