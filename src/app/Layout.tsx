import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { BrandMark, Logo } from '../components/Logo'
import { BottomNav, type BottomItem } from '../components/BottomNav'
import { Icons } from '../components/icons'
import { useAuth } from '../features/auth/AuthProvider'
import { guestMode, isGuest } from '../features/auth/guest'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`

function AccountLinks() {
  const { user, loading } = useAuth()
  const cls = navClass
  if (loading) return null
  // While guest publishing is on, accounts stay out of sight.
  const quiet = guestMode()
  if (!user) {
    return (
      <>
        {!quiet && <NavLink to="/sign-in" className={cls}>Sign in</NavLink>}
        <NavLink to="/create" className="btn-primary ml-1 h-9 py-0">Create portfolio</NavLink>
      </>
    )
  }
  return (
    <>
      <NavLink to="/me" className={cls}>My portfolio</NavLink>
      {!(quiet && isGuest(user)) && <NavLink to="/account" className={cls}>Account</NavLink>}
    </>
  )
}

/** Phone tab bar: the same destinations as the top navigation on larger screens. */
function SiteBottomNav() {
  const { user, loading } = useAuth()
  if (loading) return null
  const quiet = guestMode()
  const items: BottomItem[] = user
    ? [
        { to: '/me', label: 'My portfolio', icon: Icons.person },
        { to: '/editor', label: 'Edit', icon: Icons.pencil },
        { to: '/create', label: 'Upload', icon: Icons.upload },
        ...(quiet && isGuest(user) ? [] : [{ to: '/account', label: 'Account', icon: Icons.key }]),
      ]
    : [
        { to: '/', label: 'Home', icon: Icons.home, end: true },
        { to: '/example', label: 'Example', icon: Icons.eye },
        { to: '/create', label: 'Create', icon: Icons.plus },
        ...(quiet ? [] : [{ to: '/sign-in', label: 'Sign in', icon: Icons.key }]),
      ]
  return <BottomNav items={items} label="Main" />
}

/** Site frame: header, footer and the page in between. */
export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-4">
          <div className="shrink-0"><Logo /></div>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
            <NavLink to="/example" className={navClass}>Example</NavLink>
            <AccountLinks />
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="no-print mt-20 border-t border-line bg-surface/60 pb-16 md:pb-0">
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
              <Link to="/privacy" className="link">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </footer>
      <SiteBottomNav />
      <ScrollRestoration />
    </div>
  )
}
