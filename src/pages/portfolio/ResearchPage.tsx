import { usePortfolio } from '../../app/PortfolioLayout'
import { usePersonHead } from '../../lib/usePageTitle'
import { Chips, ExternalLinks, PageHeading, StatusMessage } from '../../components/ui'
import type { Research } from '../../content/types'
import { splitStage } from '../../content/normalize'

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="eyebrow">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed sm:text-base">{children}</div>
    </section>
  )
}

/** One research item, laid out like an academic summary: aim, objectives, method, significance. */
function ResearchItem({ item: r }: { item: Research }) {
  const meta = [r.kind, r.year].filter(Boolean).join(' · ')
  return (
    <article className="panel p-5 sm:p-8">
      {meta && <p className="text-sm font-medium text-accent">{meta}</p>}
      <h2 className="display mt-1 text-2xl leading-tight text-balance sm:text-3xl">{r.title}</h2>
      {r.keywords.length > 0 && <div className="mt-3"><Chips items={r.keywords} label={`${r.title} keywords`} /></div>}

      {r.summary && <Part title="Background"><p>{r.summary}</p></Part>}
      {r.aim && <Part title="Aim"><p>{r.aim}</p></Part>}
      {r.objectives.length > 0 && (
        <Part title="Objectives">
          <ol className="list-decimal space-y-1.5 pl-5">
            {r.objectives.map((o) => <li key={o}>{o}</li>)}
          </ol>
        </Part>
      )}
      {r.method.length > 0 && (
        <Part title="Method">
          <ol className="space-y-3">
            {r.method.map((stage, i) => {
              const [name, text] = splitStage(stage)
              return (
                <li key={stage} className="flex gap-3">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                  <p className="min-w-0">{name && <strong className="font-semibold">{name}. </strong>}{text}</p>
                </li>
              )
            })}
          </ol>
        </Part>
      )}
      {r.significance && <Part title="Significance"><p>{r.significance}</p></Part>}
      <ExternalLinks links={r.links} className="mt-6" />
    </article>
  )
}

export function ResearchPage() {
  const { cv } = usePortfolio()
  usePersonHead(cv.name, 'Research')

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeading eyebrow="Research" title="Research" accent="work.">
        Questions I am investigating, how I approach them and why they matter.
      </PageHeading>
      {cv.research.length === 0 ? (
        <StatusMessage title="Research coming soon." />
      ) : (
        <div className="space-y-6">
          {cv.research.map((r) => <ResearchItem key={r.title} item={r} />)}
        </div>
      )}
    </div>
  )
}
