import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { BrandMark, Logo } from '../components/Logo'
import { useAuth } from '../features/auth/AuthProvider'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`

function AccountLinks({ mobile = false }: { mobile?: boolean }) {
  const { user, loading } = useAuth()
  const cls = (s: { isActive: boolean }) => `${navClass(s)} ${mobile ? 'py-2 text-base' : ''}`
  if (loading) return null
  if (!user) return <NavLink to="/sign-in" className={mobile ? cls : 'btn-secondary ml-2 h-9 py-0'}>Sign in</NavLink>
  return (
    <>
      <NavLink to="/editor" className={cls}>My portfolio</NavLink>
      <NavLink to="/account" className={cls}>Account</NavLink>
    </>
  )
}

/** Site frame: header, footer and the page in between. */
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-4">
          <div className="shrink-0"><Logo /></div>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
            <NavLink to="/create" className={navClass}>Create</NavLink>
            <NavLink to="/example" className={navClass}>Example</NavLink>
            <AccountLinks />
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
            <NavLink to="/create" className={(s) => `${navClass(s)} py-2 text-base`}>Create</NavLink>
            <NavLink to="/example" className={(s) => `${navClass(s)} py-2 text-base`}>Example</NavLink>
            <AccountLinks mobile />
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="no-print mt-20 border-t border-line bg-surface/60">
        <div className="container-page flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <BrandMark className="w-14" />
            <div>
              <p className="display text-lg leading-tight"><span className="text-brand-navy">CivilEng</span> <em className="text-brand-italic">Portfolio</em></p>
              <p className="text-muted">Edmund, Ontario</p>
            </div>
          </div>
          <div className="max-w-md text-xs text-muted sm:text-right">
            <p>Turn your résumé into a portfolio website.</p>
            <p className="mt-1">
              Part of CivilEng, with{' '}
              <a className="link" href="https://civileng-researchhub.vercel.app" target="_blank" rel="noopener noreferrer">ResearchHub</a>.{' '}
              <Link to="/privacy" className="link">Privacy</Link>
            </p>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
