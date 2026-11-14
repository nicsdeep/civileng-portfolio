import { usePortfolio } from '../app/Layout'
import { usePageTitle } from '../lib/usePageTitle'
import { Chips, ExternalLinks, PageHeading, StatusMessage } from '../components/ui'

export function ProjectsPage() {
  usePageTitle('Projects')
  const { cv } = usePortfolio()

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeading eyebrow="Work" title="Selected" accent="projects.">
        What I have built, what it does and the tools behind it.
      </PageHeading>
      {cv.projects.length === 0 ? (
        <StatusMessage title="Projects coming soon." />
      ) : (
        <div className="space-y-6">
          {cv.projects.map((p) => (
            <article key={p.title} className="panel p-6 sm:p-8">
              <h2 className="display text-3xl sm:text-4xl">{p.title}</h2>
              {p.subtitle && <p className="mt-1 text-accent">{p.subtitle}</p>}
              <p className="mt-4">{p.description}</p>
              <div className="mt-5"><Chips items={p.tech} label={`${p.title} technologies`} /></div>
              <ExternalLinks links={p.links} className="mt-4" />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
