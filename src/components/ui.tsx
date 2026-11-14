import type { ReactNode } from 'react'
import type { Link as CvLink } from '../content/types'

/** Page heading in the house style: serif, with an italic teal accent word. */
export function PageHeading({ eyebrow, title, accent, children }: { eyebrow?: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="display mt-1 text-5xl sm:text-6xl">
        {title} {accent && <em className="text-brand-italic">{accent}</em>}
      </h1>
      {children && <div className="mt-3 max-w-2xl text-muted">{children}</div>}
    </header>
  )
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return <h2 id={id} className="display mb-4 text-3xl">{children}</h2>
}

export function Chips({ items, label }: { items: string[]; label?: string }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={label}>
      {items.map((item) => <li key={item} className="chip">{item}</li>)}
    </ul>
  )
}

export function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-accent">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

/** External links open in a new tab; URLs are already checked by normalizeCv. */
export function ExternalLinks({ links, className = '' }: { links: CvLink[]; className?: string }) {
  if (links.length === 0) return null
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${className}`}>
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} className="link font-medium" target="_blank" rel="noopener noreferrer">
            {l.label} <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function StatusMessage({ title, children, tone = 'neutral', action }: { title: string; children?: ReactNode; tone?: 'neutral' | 'error'; action?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="border-y border-line py-10 text-center">
      <p className={`display text-2xl ${tone === 'error' ? 'text-danger' : 'text-ink'}`}>{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
