/**
 * The whole portfolio is one document, stored as JSON in
 * public.pf_profiles.content. Images (photo, logos, project images) are
 * links to pictures elsewhere on the web, usually found by pasting a page
 * link in the editor (see src/features/links).
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
  /** Company logo (image link). */
  logo: string
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
  /** School or university logo (image link). */
  logo: string
  location: string
  /** Free text, e.g. "Expected November 2026". */
  dates: string
  bullets: string[]
}

export interface Project {
  title: string
  subtitle: string
  description: string
  /** Screenshot or cover picture (image link). */
  image: string
  tech: string[]
  /** The first link is shown under the project as its live/hosted link. */
  links: Link[]
  /** Featured projects also appear on the home page. */
  featured: boolean
}

/** A research proposal, thesis or paper, with the parts readers of academic work look for. */
export interface Research {
  title: string
  /** e.g. "Research proposal", "Thesis", "Journal paper". */
  kind: string
  /** Free text, e.g. "2026" or "In progress". */
  year: string
  /** Background or abstract. */
  summary: string
  aim: string
  objectives: string[]
  /** Method stages in order, e.g. "Data acquisition: …". */
  method: string[]
  significance: string
  keywords: string[]
  /** DOI, paper or document links. */
  links: Link[]
}

export interface Certification {
  name: string
  issuer: string
  date: string
  /** Credential or verification page. */
  url: string
}

export interface Testimonial {
  quote: string
  name: string
  title: string
}

export interface Cv {
  name: string
  /** Profile photo (image link). */
  photo: string
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
  research: Research[]
  certifications: Certification[]
  interests: string[]
  testimonials: Testimonial[]
}
