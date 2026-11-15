import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { clearDraft, loadDraft } from '../features/import/draft'
import { useMyPortfolio } from '../features/portfolio/hooks'
import { publishResume } from '../features/portfolio/publish'
import { usePageTitle } from '../lib/usePageTitle'
import { StatusMessage } from '../components/ui'

/**
 * /finish: the last step after signing in or confirming a new account.
 * Publishes the résumé waiting in this browser and opens the portfolio.
 */
export function FinishPage() {
  usePageTitle('Publishing')
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const draft = loadDraft()

  async function run() {
    if (!user || !draft) return
    setError(null)
    try {
      const { slug, replaced } = await publishResume(user.id, draft.cv)
      clearDraft()
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] })
      navigate(`/p/${slug}?status=${replaced ? 'updated' : 'new'}`, { replace: true })
    } catch (e) {
      setError((e instanceof Error && e.message) || 'Could not publish. Try again.')
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void run()
    // Runs once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!draft) return <Navigate to="/me" replace />
  if (error) {
    return (
      <div className="container-page py-12">
        <StatusMessage title="Your portfolio could not be published yet." tone="error" action={
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => void run()}>Try again</button>
            <Link to="/create" className="btn-secondary">Back</Link>
          </div>
        }>
          {error}
        </StatusMessage>
      </div>
    )
  }
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-24 text-center" role="status" aria-live="polite">
      <span className="size-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" aria-hidden="true" />
      <p className="display mt-6 text-3xl">Publishing your portfolio…</p>
      <p className="mt-2 text-sm text-muted">This takes a few seconds.</p>
    </div>
  )
}

/** /me: your own portfolio if you have one, otherwise the Create page. */
export function MePage() {
  usePageTitle('My portfolio')
  const mine = useMyPortfolio()
  if (mine.isPending) return <div className="container-page py-16 text-center text-muted" role="status">Opening your portfolio…</div>
  if (mine.isError) {
    return (
      <div className="container-page py-12">
        <StatusMessage title="Could not open your portfolio." tone="error" action={<button className="btn-secondary" onClick={() => mine.refetch()}>Try again</button>}>
          Check your connection and try again.
        </StatusMessage>
      </div>
    )
  }
  return <Navigate to={mine.data?.slug ? `/p/${mine.data.slug}` : '/create'} replace />
}
