import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { claimDraftUpload, clearDraft } from '../import/draft'

interface AuthState {
  user: User | null
  session: Session | null
  /** True until the stored session has been checked. */
  loading: boolean
  /** Set when the visitor arrived from a password-reset email. */
  recovering: boolean
}

const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true, recovering: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true, recovering: false })
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => ({ ...s, session: data.session, user: data.session?.user ?? null, loading: false }))
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({
        session,
        user: session?.user ?? null,
        loading: false,
        recovering: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : s.recovering,
      }))
      // Never show one person's draft to the next person on this device.
      // A résumé uploaded before signing in now belongs to this account.
      // (Deferred: calling Supabase inside this callback can deadlock it.)
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) setTimeout(() => void claimDraftUpload().catch(() => {}), 0)
      // Also drop any unsaved résumé, so a shared computer keeps nothing behind.
      if (event === 'SIGNED_OUT') {
        queryClient.removeQueries({ queryKey: ['my-portfolio'] })
        clearDraft()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
