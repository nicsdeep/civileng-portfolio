import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router'
import { usePortfolioBySlug, type PublicPortfolio } from '../features/portfolio/api'
import { exampleCv } from '../content/example'
import { StatusMessage } from '../components/ui'
import { usePageTitle } from '../lib/usePageTitle'

/** The portfolio being shown, for the pages inside a PortfolioLayout. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio() {
  return useOutletContext<PublicPortfolio>()
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`

function PortfolioFrame({ portfolio, example = false }: { portfolio: PublicPortfolio; example?: boolean }) {
  const base = portfolio.basePath
  const { cv } = portfolio
  const has = {
    experience: cv.experience.length + cv.education.length > 0,
    projects: cv.projects.length > 0,
    skills: cv.skills.length + cv.certifications.length + cv.interests.length > 0,
  }
  return (
    <>
      {example && (
        <p className="no-print border-b border-line bg-accent-soft px-4 py-2 text-center text-sm">
          This is an example with a made-up person. <Link to="/create" className="link font-semibold">Create yours from your résumé →</Link>
        </p>
      )}
      <nav aria-label="Portfolio" className="no-print border-b border-line">
        <div className="container-page flex items-center gap-1 overflow-x-auto py-2">
          <NavLink to={base} end className={navClass}>Overview</NavLink>
          {has.experience && <NavLink to={`${base}/experience`} className={navClass}>Experience</NavLink>}
          {has.projects && <NavLink to={`${base}/projects`} className={navClass}>Projects</NavLink>}
          {has.skills && <NavLink to={`${base}/skills`} className={navClass}>Skills</NavLink>}
          <NavLink to={`${base}/contact`} className={navClass}>Contact</NavLink>
        </div>
      </nav>
      <Outlet context={portfolio} />
    </>
  )
}

function Skeleton() {
  return (
    <div className="container-page py-16" role="status" aria-label="Loading">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-2/3 rounded bg-surface" />
        <div className="h-4 w-1/2 rounded bg-surface" />
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-5/6 rounded bg-surface" />
      </div>
    </div>
  )
}

/** /p/:slug — a published portfolio. */
export function PortfolioLayout() {
  const { slug = '' } = useParams()
  const query = usePortfolioBySlug(slug.toLowerCase())
  usePageTitle(query.data?.cv.name)

  if (query.isPending) return <Skeleton />
  if (query.isError) {
    return (
      <div className="container-page py-12">
        <StatusMessage title="This portfolio could not be loaded." tone="error" action={<button className="btn-secondary" onClick={() => query.refetch()}>Try again</button>}>
          Check your connection and try again.
        </StatusMessage>
      </div>
    )
  }
  if (!query.data) {
    return (
      <div className="container-page py-12">
        <h1 className="display text-5xl">Portfolio <em className="text-brand-italic">not found.</em></h1>
        <p className="mt-3 text-muted">There is no published portfolio at this address. It may have been renamed or unpublished.</p>
        <Link to="/create" className="btn-primary mt-6">Create your own portfolio</Link>
      </div>
    )
  }
  return <PortfolioFrame portfolio={query.data} />
}

const example: PublicPortfolio = { cv: exampleCv, basePath: '/example', updatedAt: null }

/** /example — the made-up portfolio that shows what visitors will get. */
export function ExampleLayout() {
  usePageTitle('Example')
  return <PortfolioFrame portfolio={example} example />
}
