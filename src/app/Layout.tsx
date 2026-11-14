import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useOutletContext } from 'react-router'
import { BrandMark, Logo } from '../components/Logo'
import { useAuth } from '../features/auth/AuthProvider'
import { usePublicPortfolio, type PublicPortfolio } from '../features/portfolio/api'

const NAV = [
  { to: '/experience', label: 'Experience' },
  { to: '/projects', label: 'Projects' },
  { to: '/skills', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`

/** The portfolio content, loaded once here and shared with every public page. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio() {
  return useOutletContext<PublicPortfolio>()
}

function EditLink() {
  const { user } = useAuth()
  if (!user) return null
  return <NavLink to="/editor" className={navClass}>Edit</NavLink>
}

function PageSkeleton() {
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

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const portfolio = usePublicPortfolio()
  useEffect(() => setMenuOpen(false), [location.pathname])
  const cv = portfolio.data?.cv

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-4">
          <div className="shrink-0"><Logo /></div>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => <NavLink key={item.to} to={item.to} className={navClass}>{item.label}</NavLink>)}
            <EditLink />
          </nav>
          <button
            type="button"
            className="btn-secondary ml-auto h-9 px-3 py-0 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Main" className="container-page flex flex-col gap-1 border-t border-line pb-3 md:hidden">
            <NavLink to="/" end className={(s) => `${navClass(s)} py-2 text-base`}>Home</NavLink>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={(s) => `${navClass(s)} py-2 text-base`}>{item.label}</NavLink>
            ))}
            <EditLink />
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        {portfolio.data ? <Outlet context={portfolio.data} /> : <PageSkeleton />}
      </main>

      <footer className="no-print mt-20 border-t border-line bg-surface/60">
        <div className="container-page flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <BrandMark className="w-14" />
            <div>
              <p className="display text-lg leading-tight"><span className="text-brand-navy">CivilEng</span> <em className="text-brand-italic">Portfolio</em></p>
              <p className="text-muted">{cv ? `${cv.name}${cv.location ? ` · ${cv.location}` : ''}` : ' '}</p>
            </div>
          </div>
          <div className="text-xs text-muted sm:text-right">
            <p>© {new Date().getFullYear()} {cv?.name}</p>
            <p className="mt-1">
              Part of CivilEng, with <a className="link" href="https://civileng-researchhub.vercel.app" target="_blank" rel="noopener noreferrer">ResearchHub</a>.{' '}
              <Link to="/sign-in" className="link">Owner sign-in</Link>
            </p>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
