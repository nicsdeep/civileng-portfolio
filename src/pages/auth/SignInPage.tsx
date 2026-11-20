import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { supabase, authMessage } from '../../lib/supabase'
import { useAuth } from '../../features/auth/AuthProvider'
import { usePageTitle } from '../../lib/usePageTitle'
import { AuthLayout, Field, FormError } from './AuthLayout'
import { safeNext } from '../../features/auth/validation'

const RESEND_SECONDS = 60

/**
 * Passwordless sign-in (also used at /sign-up and /forgot-password): one email
 * field. New and returning people get the same email link; following it signs
 * them in, creates the account the first time, and returns them to `next`
 * (for example /finish, which publishes the portfolio they just made).
 */
export function SignInPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const publishing = next === '/finish'
  usePageTitle(publishing ? 'Publish your portfolio' : 'Sign in')
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  if (user && !sentTo) return <Navigate to={next} replace />

  async function send(address: string) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}${next}`, shouldCreateUser: true },
    })
    setBusy(false)
    if (error) return setError(authMessage(error))
    setSentTo(address)
    setWait(RESEND_SECONDS)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(email.trim())
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your" accent="inbox.">
        <p>
          We sent a link to <strong className="break-all">{sentTo}</strong>.{' '}
          {publishing ? 'Open it and your portfolio goes live straight away.' : 'Open it to sign in. There is no password to remember.'}
        </p>
        <p className="mt-3 text-sm text-muted">
          Open the link in this same browser. It works once and expires after an hour. No email? Check spam or promotions.
        </p>
        <div className="mt-4"><FormError message={error} /></div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={busy || wait > 0} onClick={() => void send(sentTo)}>
            {wait > 0 ? `Send again in ${wait}s` : busy ? 'Sending…' : 'Send again'}
          </button>
          <button type="button" className="btn-quiet" onClick={() => { setSentTo(null); setError(null) }}>Use a different email</button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={publishing ? 'One last' : 'Sign in with'}
      accent={publishing ? 'step.' : 'email.'}
      intro={
        publishing
          ? 'Your portfolio is ready. Enter your email and we will send a link that publishes it and keeps it yours.'
          : 'Enter your email and we will send you a link to sign in. New here? The same link creates your free account.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="email" label="Email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <FormError message={error} />
        <button type="submit" className="btn-primary h-11 w-full text-base" disabled={busy}>
          {busy ? 'Sending link…' : publishing ? 'Email me the link to publish' : 'Email me a sign-in link'}
        </button>
      </form>
      <p className="mt-5 text-xs text-muted">One CivilEng account works on this portfolio and on ResearchHub. No password needed.</p>
    </AuthLayout>
  )
}
