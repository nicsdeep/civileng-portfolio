import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../features/auth/AuthProvider'
import { usePageTitle } from '../../lib/usePageTitle'

export function AccountPage() {
  usePageTitle('Account')
  const { user } = useAuth()
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="display text-5xl">Your <em className="text-brand-italic">account.</em></h1>
      <section className="panel mt-8 p-6" aria-labelledby="profile">
        <h2 id="profile" className="label">Signed in as</h2>
        <p className="font-medium break-all">{user?.email}</p>
        <p className="mt-1 text-sm text-muted">You sign in with a link sent to this email; there is no password. This account also works on CivilEng ResearchHub.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/me" className="btn-primary">My portfolio</Link>
          <button type="button" className="btn-secondary" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </div>
  )
}
