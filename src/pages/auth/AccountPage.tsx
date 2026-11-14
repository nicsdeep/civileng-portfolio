import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase, authMessage } from '../../lib/supabase'
import { useAuth } from '../../features/auth/AuthProvider'
import { usePageTitle } from '../../lib/usePageTitle'
import { Field, FormError } from './AuthLayout'
import { passwordProblem } from '../../features/auth/validation'

export function AccountPage() {
  usePageTitle('Account')
  const { user, recovering } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    const problem = passwordProblem(password)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    setDone(false)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(authMessage(error))
    else {
      setDone(true)
      setPassword('')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="display text-5xl">Your <em className="text-brand-italic">account.</em></h1>

      {recovering && (
        <p role="status" className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          You followed a password reset link. Choose a new password below.
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section className="panel p-6" aria-labelledby="profile">
          <h2 id="profile" className="label">Signed in as</h2>
          <p className="font-medium break-all">{user?.email}</p>
          <p className="mt-1 text-sm text-muted">This account also works on CivilEng ResearchHub.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/editor" className="btn-primary">Edit portfolio</Link>
            <button type="button" className="btn-secondary" onClick={signOut}>Sign out</button>
          </div>
        </section>

        <section className="panel p-6" aria-labelledby="password-h">
          <h2 id="password-h" className="label">Change password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <Field
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              hint="At least 8 characters, with letters and numbers."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormError message={error} />
            {done && <p role="status" className="text-sm text-ok">Password updated.</p>}
            <button type="submit" className="btn-secondary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          </form>
        </section>
      </div>
    </div>
  )
}
