import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { guestMode, startGuestSession } from './guest'

/**
 * Sends signed-out visitors to sign in, then back here afterwards.
 * While guest publishing is on, they get a guest session instead, with no sign-in step.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [guest, setGuest] = useState<'trying' | 'failed' | null>(null)
  const wantGuest = !loading && !user && guestMode()

  useEffect(() => {
    if (!wantGuest || guest) return
    setGuest('trying')
    void startGuestSession().then((u) => { if (!u) setGuest('failed') })
  }, [wantGuest, guest])

  if (loading || (wantGuest && guest !== 'failed')) return <div className="container-page py-16 text-center text-muted" role="status">Loading…</div>
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/sign-in?next=${next}`} replace />
  }
  return <>{children}</>
}
