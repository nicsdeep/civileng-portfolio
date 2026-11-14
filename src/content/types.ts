/**
 * The whole portfolio is one document. It is stored as JSON in
 * public.pf_profiles.content and bundled as a fallback in ./cv.ts.
 */
export interface Link {
  label: string
  url: string
}

export interface SkillGroup {
  group: string
  items: string[]
}

export interface Experience {
  role: string
  org: string
  location: string
  /** Free text, e.g. "07/2022" or "March 2026". */
  start: string
  /** Free text; empty means "Present". */
  end: string
  bullets: string[]
}

export interface Education {
  degree: string
  school: string
  location: string
  /** Free text, e.g. "Expected November 2026". */
  dates: string
  bullets: string[]
}

export interface Project {
  title: string
  subtitle: string
  description: string
  tech: string[]
  links: Link[]
  /** Featured projects also appear on the home page. */
  featured: boolean
}

export interface Certification {
  name: string
  issuer: string
  date: string
}

export interface Testimonial {
  quote: string
  name: string
  title: string
}

export interface Cv {
  name: string
  headline: string
  location: string
  /** Short status line, e.g. "Final-year student · graduating November 2026". */
  status: string
  email: string
  /** Left empty by default: a public phone number attracts spam. */
  phone: string
  summary: string
  links: Link[]
  skills: SkillGroup[]
  experience: Experience[]
  education: Education[]
  projects: Project[]
  certifications: Certification[]
  interests: string[]
  testimonials: Testimonial[]
}
