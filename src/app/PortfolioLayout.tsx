import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, ScrollRestoration, useLocation, useOutletContext, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { saveMyPortfolio, type PublicPortfolio } from '../features/portfolio/api'
import { useMovedSlug, useMyPortfolio, usePortfolioBySlug } from '../features/portfolio/hooks'
import { forgetPrevious, loadPrevious } from '../features/portfolio/publish'
import { exampleCv } from '../content/example'
import { StatusMessage } from '../components/ui'
import { BottomNav, type BottomItem } from '../components/BottomNav'
import { Icons } from '../components/icons'
import { WebImage } from '../features/links/LinkFields'
import { useAuth } from '../features/auth/AuthProvider'

/** The portfolio being shown, for the pages inside a PortfolioLayout. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio() {
  return useOutletContext<PublicPortfolio>()
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:text-ink'}`

const SITE = 'https://civileng-portfolio.vercel.app'

/** Copy or share the portfolio address; shows "Copied" for a moment. */
function ShareButton({ path, className = 'btn-secondary h-9 py-0' }: { path: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : SITE}${path}`
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: 'My portfolio', url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Share sheet closed: nothing to do.
    }
  }
  return (
    <button type="button" className={className} onClick={share}>
      {copied ? 'Link copied ✓' : 'Share link'}
    </button>
  )
}

const STATUS_TEXT: Record<string, { title: string; text: string }> = {
  new: { title: 'Your portfolio is live!', text: 'Share the link below. You can change anything at any time.' },
  updated: { title: 'Your portfolio is updated.', text: 'We used your new résumé and kept the pictures and links you added.' },
  saved: { title: 'Changes saved.', text: 'This is what visitors see now.' },
}

/** Success message after publishing or saving, with share and undo. */
function StatusBanner({ portfolio, slug }: { portfolio: PublicPortfolio; slug: string }) {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [undoing, setUndoing] = useState(false)
  const previous = status === 'updated' ? loadPrevious(slug) : null
  const info = STATUS_TEXT[status]
  if (!info) return null

  const close = () => {
    forgetPrevious()
    params.delete('status')
    setParams(params, { replace: true })
  }

  async function undo() {
    if (!user || !previous) return
    setUndoing(true)
    try {
      await saveMyPortfolio(user.id, previous, slug, portfolio.published)
      forgetPrevious()
      await queryClient.invalidateQueries({ queryKey: ['portfolio', slug] })
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] })
      params.set('status', 'saved')
      setParams(params, { replace: true })
    } finally {
      setUndoing(false)
    }
  }

  return (
    <div role="status" className="no-print border-b border-line bg-accent-soft">
      <div className="container-page flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="min-w-0 text-sm sm:flex-1">
          <strong className="mr-1">✓ {info.title}</strong>
          <span className="text-muted">{info.text}</span>
          <span className="mt-1 block truncate font-medium text-accent">{SITE.replace('https://', '')}/p/{slug}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton path={`/p/${slug}`} className="btn-secondary h-9 py-0" />
          {previous && <button type="button" className="btn-secondary h-9 py-0" onClick={undo} disabled={undoing}>{undoing ? 'Undoing…' : 'Undo'}</button>}
          <button type="button" className="btn-quiet" aria-label="Close message" onClick={close}>✕</button>
        </div>
      </div>
    </div>
  )
}

/** Only the owner sees this: quick ways to update the portfolio. */
function OwnerBar({ portfolio, slug }: { portfolio: PublicPortfolio; slug: string }) {
  const [params] = useSearchParams()
  // The success message above already offers Share; never show the same action twice.
  const showShare = portfolio.published && !STATUS_TEXT[params.get('status') ?? '']
  return (
    <div className="no-print border-b border-line bg-surface">
      <div className="container-page flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:gap-3">
        <p className="text-muted sm:min-w-0 sm:flex-1">
          {portfolio.published ? 'This is your portfolio.' : <><strong className="text-ink">Hidden.</strong> Only you can see this.</>} Want to update it?
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/editor" className="btn-secondary h-9 py-0">Edit details</Link>
          <Link to="/create" className="btn-quiet h-9">Upload new résumé</Link>
          {showShare && <ShareButton path={`/p/${slug}`} className="btn-quiet h-9" />}
        </div>
      </div>
    </div>
  )
}

function Avatar({ cv, className }: { cv: PublicPortfolio['cv']; className: string }) {
  const initials = cv.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-navy font-serif text-white ${className}`}>
      <span aria-hidden="true">{initials}</span>
      {cv.photo && <WebImage src={cv.photo} alt="" className="absolute inset-0 size-full object-cover" />}
    </span>
  )
}

/**
 * What a visitor of a shared link sees: only the person's portfolio, with
 * their name on top, the sections (bottom tab bar on phones) and nothing
 * about the platform. Owners also get their success banner and owner bar.
 */
function PortfolioFrame({ portfolio, example = false, slug }: { portfolio: PublicPortfolio; example?: boolean; slug?: string }) {
  const base = portfolio.basePath
  const { cv } = portfolio
  const mine = useMyPortfolio()
  const isOwner = Boolean(slug && mine.data?.slug === slug)
  const has = {
    experience: cv.experience.length + cv.education.length > 0,
    projects: cv.projects.length > 0,
    skills: cv.skills.length + cv.certifications.length + cv.interests.length > 0,
  }
  const sections: BottomItem[] = [
    { to: base, label: 'About', icon: Icons.person, end: true },
    ...(has.experience ? [{ to: `${base}/experience`, label: 'Experience', icon: Icons.briefcase }] : []),
    ...(has.projects ? [{ to: `${base}/projects`, label: 'Projects', icon: Icons.grid }] : []),
    ...(has.skills ? [{ to: `${base}/skills`, label: 'Skills', icon: Icons.star }] : []),
    { to: `${base}/contact`, label: 'Contact', icon: Icons.mail },
  ]
  return (
    <div className="flex min-h-dvh flex-col">
      {example && (
        <p className="no-print border-b border-line bg-accent-soft px-4 py-2 text-center text-sm">
          Example with a made-up person. <Link to="/create" className="link font-semibold">Create yours →</Link>
        </p>
      )}
      {slug && isOwner && <StatusBanner portfolio={portfolio} slug={slug} />}
      {slug && isOwner && <OwnerBar portfolio={portfolio} slug={slug} />}
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="container-page flex h-14 items-center gap-3">
          <Link to={base} className="flex min-w-0 items-center gap-2.5">
            <Avatar cv={cv} className="size-8 text-sm" />
            <span className="display truncate text-xl leading-none">{cv.name}</span>
          </Link>
          <nav aria-label="Sections" className="ml-auto hidden items-center gap-1 md:flex">
            {sections.map((s) => (
              <NavLink key={s.to} to={s.to} end={s.end} className={navClass}>{s.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet context={portfolio} />
      </main>
      <footer className="no-print border-t border-line py-6 pb-24 text-center text-xs text-muted md:pb-6">
        © {new Date().getFullYear()} {cv.name}
        {cv.email && <> · <a href={`mailto:${cv.email}`} className="link">{cv.email}</a></>}
      </footer>
      <BottomNav items={sections} label="Sections" />
      <ScrollRestoration />
    </div>
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

/** /p/:slug — a portfolio. Hidden ones are only visible to their owner. */
export function PortfolioLayout() {
  const { slug = '' } = useParams()
  const lower = slug.toLowerCase()
  const query = usePortfolioBySlug(lower)
  // An address that is free now may have moved: old links follow the portfolio.
  const moved = useMovedSlug(lower, query.isSuccess && !query.data)
  const location = useLocation()

  if (query.isPending || moved.isLoading) return <Skeleton />
  if (query.isError) {
    return (
      <div className="container-page py-16">
        <StatusMessage title="This portfolio could not be loaded." tone="error" action={<button className="btn-secondary" onClick={() => query.refetch()}>Try again</button>}>
          Check your connection and try again.
        </StatusMessage>
      </div>
    )
  }
  if (!query.data && moved.data) {
    const rest = location.pathname.replace(/^\/p\/[^/]+/, '')
    return <Navigate to={`/p/${moved.data}${rest}${location.search}`} replace />
  }
  if (!query.data) {
    return (
      <div className="container-page py-16">
        <h1 className="display text-5xl">Portfolio <em className="text-brand-italic">not found.</em></h1>
        <p className="mt-3 text-muted">There is no portfolio at this address. It may have been renamed or hidden.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/create" className="btn-primary">Create your own portfolio</Link>
          <Link to="/" className="btn-secondary">Home</Link>
        </div>
      </div>
    )
  }
  return <PortfolioFrame portfolio={query.data} slug={lower} />
}

const example: PublicPortfolio = { cv: exampleCv, basePath: '/example', updatedAt: null, published: true }

/** /example — the made-up portfolio that shows what visitors will get. */
export function ExampleLayout() {
  return <PortfolioFrame portfolio={example} example />
}
