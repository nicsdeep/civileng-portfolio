import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { isGuest } from '../../features/auth/guest'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../features/auth/AuthProvider'
import { usePageTitle } from '../../lib/usePageTitle'

export function AccountPage() {
  usePageTitle('Account')
  const { user } = useAuth()
  const navigate = useNavigate()

  const guest = isGuest(user)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  /** A guest keeps their portfolio and can then sign in from any device. */
  async function addEmail(event: FormEvent) {
    event.preventDefault()
    setNote(null)
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/me` })
    setNote(error ? { ok: false, text: error.message || 'Could not save that email. Try again.' } : { ok: true, text: 'Check your inbox and open the link to confirm. Your portfolio stays as it is.' })
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="display text-5xl">Your <em className="text-brand-italic">account.</em></h1>
      {guest ? (
      <section className="panel mt-8 p-6" aria-labelledby="keep">
        <h2 id="keep" className="label">Keep your portfolio</h2>
        <p className="text-sm text-muted">Your portfolio is linked to this browser. Add your email to edit it from any device.</p>
        <form onSubmit={addEmail} className="mt-4 flex flex-wrap gap-2">
          <label htmlFor="guest-email" className="sr-only">Email</label>
          <input id="guest-email" type="email" required autoComplete="email" className="field min-w-0 flex-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button type="submit" className="btn-primary">Save email</button>
        </form>
        {note && <p role={note.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${note.ok ? 'text-accent' : 'text-danger'}`}>{note.text}</p>}
        <div className="mt-5"><Link to="/me" className="btn-secondary">My portfolio</Link></div>
      </section>
      ) : (
      <section className="panel mt-8 p-6" aria-labelledby="profile">
        <h2 id="profile" className="label">Signed in as</h2>
        <p className="font-medium break-all">{user?.email}</p>
        <p className="mt-1 text-sm text-muted">You sign in with a link sent to this email; there is no password. This account also works on CivilEng ResearchHub.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/me" className="btn-primary">My portfolio</Link>
          <button type="button" className="btn-secondary" onClick={signOut}>Sign out</button>
        </div>
      </section>
      )}
    </div>
  )
}
