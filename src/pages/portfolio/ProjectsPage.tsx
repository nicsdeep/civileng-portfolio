import { useState } from 'react'
import { usePortfolio } from '../../app/PortfolioLayout'
import { usePersonHead } from '../../lib/usePageTitle'
import { Chips, ExternalLinks, HostedLink, PageHeading, StatusMessage } from '../../components/ui'
import { WebImage } from '../../features/links/LinkFields'
import { isTechnicalLink } from '../../content/normalize'
import type { Project } from '../../content/types'

/** A compact project card: small but readable text, long descriptions fold behind "Read more". */
function ProjectCard({ project: p }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const links = p.links.filter((l) => !isTechnicalLink(l))
  const long = p.description.length > 220
  return (
    <article className="panel flex flex-col overflow-hidden">
      <WebImage src={p.image} alt={`${p.title} preview`} className="aspect-[16/9] w-full border-b border-line object-cover" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="display text-xl leading-tight sm:text-2xl">{p.title}</h2>
        {p.subtitle && <p className="mt-0.5 text-sm text-accent">{p.subtitle}</p>}
        <HostedLink link={links[0]} className="mt-1.5" />
        {p.description && (
          <p className={`mt-3 text-sm leading-relaxed ${long && !open ? 'line-clamp-4 print:line-clamp-none' : ''}`}>{p.description}</p>
        )}
        {long && (
          <button type="button" className="link no-print mt-1 self-start text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
        <div className="mt-3"><Chips items={p.tech} label={`${p.title} technologies`} /></div>
        <ExternalLinks links={links.slice(1)} className="mt-3" />
      </div>
    </article>
  )
}

export function ProjectsPage() {
  const { cv } = usePortfolio()
  usePersonHead(cv.name, 'Projects')

  return (
    <div className="container-page max-w-5xl py-10">
      <PageHeading eyebrow="Work" title="Selected" accent="projects.">
        What I have built, what it does and the tools behind it.
      </PageHeading>
      {cv.projects.length === 0 ? (
        <StatusMessage title="Projects coming soon." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cv.projects.map((p) => <ProjectCard key={p.title} project={p} />)}
        </div>
      )}
    </div>
  )
}
